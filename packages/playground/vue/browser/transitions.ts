/**
 * The theme's CSS transitions in a real browser — shared by the specs that
 * watch a layer appear and disappear (`drawer.spec.ts`, `dialog.spec.ts`,
 * `popover.spec.ts`, `select.spec.ts`, `date-picker.spec.ts`,
 * `popover-swipe.spec.ts`, `anchored-swipe.spec.ts`, `calendar.spec.ts`,
 * `anchor.spec.ts`), a new value travel to its place (`slider.spec.ts`,
 * `progress-linear.spec.ts`, `tabs-line.spec.ts`, `tabs-contained.spec.ts`,
 * the dragged column's neighbour in `table.spec.ts`), a transition start (the
 * width handle's line there waits for the pointer's delay) and what an
 * animation's keyframes drive (`progress-spinner.spec.ts`,
 * `motion-mode.spec.ts`).
 *
 * The code has no animation hooks: the theme holds the transition, and it can
 * be seen only on the node itself. The browser creates a `CSSTransition`
 * object (`getAnimations()`) for every property that transitions: it shows
 * whether a transition runs, which property it drives and how long it lasts.
 *
 * One copy for everyone, like `colors.ts` and `media.ts`: were there two, one
 * spec would silently measure a transition differently from another.
 */

import { expect } from 'vitest'

/**
 * The node's transitions play out before measuring. Only its own: the
 * children's transitions — a focused button's color and the like — don't
 * belong to the layer's appearance.
 */
export const settled = (element: Element): Promise<unknown> =>
	Promise.all(element.getAnimations().map((animation) => animation.finished))

/** The properties that currently run as a CSS transition on the node. */
export const transitioning = (element: Element): string[] =>
	element
		.getAnimations()
		.filter((animation) => animation instanceof CSSTransition)
		.map((animation) => animation.transitionProperty)

/** The CSS transition of a property on the node; without it the test fails here, not on reading. */
export const transitionOf = (element: Element, property: string): CSSTransition => {
	const found = element
		.getAnimations()
		.find(
			(animation) =>
				animation instanceof CSSTransition && animation.transitionProperty === property,
		)

	if (!(found instanceof CSSTransition)) throw new Error(`${property}: перехода нет`)

	return found
}

/** A transition's duration, ms. `effect` may be `null`, and `duration` not only a number. */
export const durationOf = (transition: CSSTransition): number => {
	const duration = transition.effect?.getTiming().duration

	if (typeof duration !== 'number') {
		throw new Error(`${transition.transitionProperty}: длительности числом нет`)
	}

	return duration
}

/** A transition's delay, ms — `transition-delay`. `effect` may be `null`. */
export const delayOf = (transition: CSSTransition): number => {
	const delay = transition.effect?.getTiming().delay

	if (delay === undefined) throw new Error(`${transition.transitionProperty}: задержки нет`)

	return delay
}

/** A transition's curve — `transition-timing-function` as the browser writes it. */
export const easingOf = (transition: CSSTransition): string => {
	const easing = transition.effect?.getTiming().easing

	if (easing === undefined) throw new Error(`${transition.transitionProperty}: кривой нет`)

	return easing
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/**
 * The moments of a leaving at which `whileLeaving` checks the node, as shares
 * of the time the closed node stays on screen: from the start to near the end
 * — at the end `display` takes it off the screen.
 */
export const MOMENTS: readonly number[] = [0, 0.25, 0.5, 0.75]

/**
 * The action closes the node, and the node disappears: `check` runs at each
 * moment of the leaving (`MOMENTS`). Before it the helper makes sure the node
 * is closed (`data-open="false"` — the layer writes it on all the nodes of the
 * call) and still on screen: a node that disappeared at once fails here, and
 * the guard can't pass empty. A `check` that returns a promise is awaited
 * before the next moment.
 *
 * The leaving is read on the node's own transitions paused from their start
 * (`pausedTransitions`), at moments the helper sets (`currentTime`) as shares
 * of the `display` transition — as long as it runs, the closed node is on
 * screen. Not by the frames: under load they come rarely, and in WebKit in
 * Docker a panel was on screen for a single frame of its fade. Nor after the
 * action's response: it goes over an RPC round trip and under load comes when
 * the node is gone. Before the action the node must be open
 * (`data-open="true"`): the leaving checked is the one the action caused.
 *
 * What waits for the closing's end (`afterTransitions`: the scroll lock, the
 * anchor's tracking, Select's filter) waits for these very transitions, so at
 * every moment it holds, as while the node fades. Then the transitions play
 * out (`finish()`), and the helper waits for `display: none`. They play out
 * when `check` fails too: a layer left paused would hold the lock into the
 * next test.
 *
 * Returns the caught transitions — for `expectHidesWhenFaded`.
 */
export const whileLeaving = async (
	element: HTMLElement,
	action: () => Promise<unknown>,
	check: () => void | Promise<void>,
): Promise<ReadonlyMap<string, CSSTransition>> => {
	const before = element.dataset.open

	if (before !== 'true') throw new Error(`до действия узел не открыт: data-open="${before}"`)

	const leaving = await pausedTransitions(element, action)

	try {
		const display = leaving.get('display')

		if (display === undefined) throw new Error('display: перехода нет — узел исчез сразу')

		const shown = durationOf(display)

		for (const share of MOMENTS) {
			for (const transition of leaving.values()) transition.currentTime = shown * share

			const open = element.dataset.open

			if (open !== 'false') {
				throw new Error(`мгновение ${share}: узел не закрыт, data-open="${open}"`)
			}

			if (getComputedStyle(element).display === 'none') {
				throw new Error(`мгновение ${share}: закрытого узла на экране нет`)
			}

			await check()
		}
	} finally {
		for (const transition of leaving.values()) transition.finish()
	}

	await expect
		.poll(() => getComputedStyle(element).display, { message: 'доигранный узел исчез' })
		.toBe('none')

	return leaving
}

/**
 * The properties the browser started a transition for on the node — as
 * `transitionrun` comes. The listener is added before the action and catches a
 * transition even if it ended before the test got control back: Playwright's
 * response to input goes over an RPC round trip, and a `getAnimations()`
 * snapshot after the action could catch nothing anymore.
 */
export const transitionRuns = (element: HTMLElement): string[] => {
	const runs: string[] = []

	element.addEventListener('transitionrun', (event) => runs.push(event.propertyName))

	return runs
}

/**
 * The values of a variable in the node's inline style — as they change, by an
 * observer started before the action. A flag that lasts exactly the
 * transition's time (`--so-tabs-active-moving` of the tabs) a read after the
 * action could miss: the response of `userEvent` goes over an RPC round trip,
 * and under load the transition plays out and the flag is removed.
 */
export const styleValues = (element: HTMLElement, property: string): string[] => {
	const values: string[] = []

	new MutationObserver(() => values.push(element.style.getPropertyValue(property))).observe(
		element,
		{ attributes: true, attributeFilter: ['style'] },
	)

	return values
}

/**
 * `transitionRuns` of the node itself only. The children's transition events
 * bubble up to it, and a panel with a list or a calendar inside would get the
 * color of the row under the pointer and the day's focus ring — they don't
 * belong to the panel's appearance.
 */
export const ownTransitionRuns = (element: HTMLElement): string[] => {
	const runs: string[] = []

	element.addEventListener('transitionrun', (event) => {
		if (event.target !== element || event.pseudoElement !== '') return

		runs.push(event.propertyName)
	})

	return runs
}

/**
 * A closed panel at its anchor disappears once it has faded: its `display`
 * runs exactly the opacity's time (`themes/oren/src/mixins/_anchored.scss`) —
 * also for one that leaves the anchor longer. Longer than the opacity — and a
 * faded panel would hang in the layout transparent: the eye doesn't see it, but
 * a screen reader sees a closed panel, and what waits for the closing's end
 * (`afterTransitions`) fires later. Shorter — and the panel would disappear
 * before it has faded. The transitions are the ones `whileLeaving` returns.
 */
export const expectHidesWhenFaded = (transitions: ReadonlyMap<string, CSSTransition>): void => {
	const duration = (property: string): number => {
		const transition = transitions.get(property)

		if (transition === undefined) throw new Error(`${property}: перехода не было`)

		return durationOf(transition)
	}

	expect(duration('display'), 'display — ровно время прозрачности').toBe(duration('opacity'))
}

/**
 * The panel fades in place and only then disappears — that is how a panel at
 * its anchor closes without a gesture (`themes/oren/src/mixins/_anchored.scss`):
 * Popover, Select and DatePicker, and without motion — with a gesture too. The
 * panel is measured open, `close` closes it, and at every moment of its
 * leaving (`whileLeaving`) it catches no presses — the pointer in its middle
 * hits what is under it, — doesn't move, and its opacity only decreases. Only
 * the opacity transitions: of the panel's own transitions, besides `display`,
 * — only `opacity`. The panel disappears once it has faded
 * (`expectHidesWhenFaded`).
 */
export const expectFadesInPlace = async (
	panel: HTMLElement,
	close: () => Promise<unknown>,
): Promise<void> => {
	const { top, left, width, height } = panel.getBoundingClientRect()
	const runs = ownTransitionRuns(panel)
	const opacities: number[] = []

	const transitions = await whileLeaving(panel, close, () => {
		const box = panel.getBoundingClientRect()
		const hit = document.elementFromPoint(left + width / 2, top + height / 2)

		expect(getComputedStyle(panel).pointerEvents, 'нажатий не ловит').toBe('none')
		expect(hit !== null && panel.contains(hit), 'нажатие в середину — мимо неё').toBe(false)
		expect(Math.abs(box.top - top), 'на месте по вертикали').toBeLessThan(1)
		expect(Math.abs(box.left - left), 'на месте по горизонтали').toBeLessThan(1)
		opacities.push(Number(getComputedStyle(panel).opacity))
	})

	expect(
		runs.filter((name) => name !== 'display'),
		'переходит одна прозрачность',
	).toEqual(['opacity'])
	expectHidesWhenFaded(transitions)
	expect(Math.min(...opacities), 'прозрачность убывает').toBeLessThan(1)

	for (let index = 1; index < opacities.length; index += 1) {
		expect(opacities[index], `мгновение ${index}`).toBeLessThanOrEqual(opacities[index - 1])
	}
}

/**
 * `transitionRuns` of the node's pseudo-element. The browser sends a
 * pseudo-element's transition events to the node itself, with the
 * `pseudoElement` field, and the children's transition events bubble up to it
 * as well — the listener skips them: so the color transitions of the tabs
 * under the pointer don't get into the list card's move.
 */
export const pseudoTransitionRuns = (element: HTMLElement, pseudo: string): string[] => {
	const runs: string[] = []

	element.addEventListener('transitionrun', (event) => {
		if (event.target !== element || event.pseudoElement !== pseudo) return

		runs.push(event.propertyName)
	})

	return runs
}

/**
 * The transitions of the node's pseudo-element play out — `settled` for it. A
 * transition interrupted by a new value is cancelled, and its `finished` is
 * rejected: for the wait that is an end too.
 */
export const pseudoSettled = (element: Element, pseudo: string): Promise<unknown> =>
	Promise.all(
		element
			.getAnimations({ subtree: true })
			.filter(
				(animation) =>
					animation.effect instanceof KeyframeEffect &&
					animation.effect.target === element &&
					animation.effect.pseudoElement === pseudo,
			)
			.map((animation) => animation.finished.catch(() => undefined)),
	)

/**
 * Wait for transition events. A transition is started by a style recalc —
 * without a measurement it happens only in a frame, after the
 * `requestAnimationFrame` callbacks, — and the browser sends `transitionrun` at
 * the start of the next frame. After two frames everything the action caused
 * has come, and an empty list means there were no transitions.
 */
export const transitionEvents = async (): Promise<void> => {
	await nextFrame()
	await nextFrame()
}

/**
 * The transition of a property of the node's pseudo-element that the action
 * started — paused from its own `transitionrun`. The listener is added before
 * the action and pauses in the page, in the frame the event came, — from there
 * the transition's moment is chosen by the test (`currentTime`), not by the
 * action's response. The response of `userEvent` goes over an RPC round trip
 * and under load comes when the transition is already running: so the table
 * width handle's line, which waits for the pointer's delay, was caught already
 * lit.
 *
 * The first such transition is caught, the following ones run their course.
 * No such transition two frames after the action (`transitionEvents`) — the
 * test fails here, not by its timeout.
 */
export const pausedPseudoTransition = async (
	element: HTMLElement,
	pseudo: string,
	property: string,
	action: () => Promise<unknown>,
): Promise<CSSTransition> => {
	/** What the listener caught: a paused transition or an error. */
	const caught: Array<CSSTransition | Error> = []

	const listener = (event: TransitionEvent) => {
		if (
			event.target !== element ||
			event.pseudoElement !== pseudo ||
			event.propertyName !== property
		) {
			return
		}

		element.removeEventListener('transitionrun', listener)

		const found = element
			.getAnimations({ subtree: true })
			.find(
				(animation) =>
					animation instanceof CSSTransition &&
					animation.transitionProperty === property &&
					animation.effect instanceof KeyframeEffect &&
					animation.effect.target === element &&
					animation.effect.pseudoElement === pseudo,
			)

		if (found instanceof CSSTransition) {
			found.pause()
			caught.push(found)
		} else {
			caught.push(
				new Error(`${pseudo} ${property}: переход кончился до своего transitionrun`),
			)
		}
	}

	element.addEventListener('transitionrun', listener)

	try {
		await action()
		await transitionEvents()
	} finally {
		element.removeEventListener('transitionrun', listener)
	}

	const first = caught.at(0)

	if (first === undefined) throw new Error(`${pseudo} ${property}: перехода не было`)
	if (first instanceof Error) throw first

	return first
}

/**
 * The node's own transitions the action started — all of them paused from the
 * first own `transitionrun`. The properties of one style change start together,
 * in the frame that sends their events, so they are caught at their start
 * whatever the frame rate. From there the transitions' moment is chosen by the
 * test (`currentTime`), and not by the frames: under load they come rarely — in
 * WebKit in Docker a swiped panel was on screen for a single frame of its
 * fade, — nor by the action's response, which goes over an RPC round trip.
 *
 * Transitions of children and of pseudo-elements aren't the node's own and run
 * their course, and so do the node's later ones. No own transition after the
 * action — the test fails here, not by its timeout.
 */
export const pausedTransitions = async (
	element: HTMLElement,
	action: () => Promise<unknown>,
): Promise<ReadonlyMap<string, CSSTransition>> => {
	const paused = new Map<string, CSSTransition>()

	const listener = (event: TransitionEvent) => {
		if (event.target !== element || event.pseudoElement !== '' || paused.size > 0) return

		for (const animation of element.getAnimations()) {
			if (
				!(animation instanceof CSSTransition) ||
				!(animation.effect instanceof KeyframeEffect) ||
				animation.effect.pseudoElement !== null
			) {
				continue
			}

			animation.pause()
			paused.set(animation.transitionProperty, animation)
		}
	}

	element.addEventListener('transitionrun', listener)

	try {
		await action()
		await expect
			.poll(() => paused.size, { message: 'после действия переходов у самого узла нет' })
			.toBeGreaterThan(0)
	} finally {
		element.removeEventListener('transitionrun', listener)
	}

	return paused
}

/** Service keys of a `getKeyframes()` frame — not properties. */
const FRAME_KEYS = new Set(['offset', 'computedOffset', 'easing', 'composite'])

/**
 * The properties an animation's keyframes drive. That shows whether it is
 * motion: an indicator's run drives a shift or a rotation, a shimmer without
 * motion — the opacity alone.
 */
export const animatedProperties = (animation: Animation): string[] => {
	const frames = animation.effect instanceof KeyframeEffect ? animation.effect.getKeyframes() : []

	return [...new Set(frames.flatMap((frame) => Object.keys(frame)))].filter(
		(key) => !FRAME_KEYS.has(key),
	)
}
