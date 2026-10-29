/**
 * The guard of the helpers `whileLeaving`, `pausedPseudoTransition` and
 * `pausedTransitions` (`transitions.ts`) — without a theme.
 *
 * The helpers watch a transition from the action's start, not after it: the
 * response of `userEvent` and commands goes over an RPC round trip and under
 * load comes later than the node disappears or the transition plays out. Here
 * the action is made so — it returns three times later than the transition, —
 * and the helper still catches it.
 *
 * `whileLeaving` — on a node with its own opacity and `display` transition
 * (`allow-discrete`) in the inline style and with `data-open`, like a layer's:
 * the leaving frames are caught, frames before the closing don't get into
 * `check`, and the helper throws an error of `check` only after the action's
 * end.
 *
 * `pausedPseudoTransition` — on a node whose flag lights `::before` up by a
 * transition with a delay, and the node itself by one without: the transition
 * is caught paused before it has played out, and it is the pseudo-element's,
 * not the node's. The action started no transition — an error right after the
 * action, not the test's timeout.
 *
 * `pausedTransitions` — on the same node as `whileLeaving`: its own transitions
 * are caught paused from their start, `display` among them, so the closed node
 * stays on screen. The action started no own transition — an error after the
 * action, not the test's timeout.
 */

import { describe, it, expect, afterEach } from 'vitest'

import { delayOf, pausedPseudoTransition, pausedTransitions, whileLeaving } from './transitions'

/** The node's closing transition duration, ms. */
const DURATION = 100

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** An open node on the page — with a closing transition or without one. */
const mount = (transition: boolean): HTMLElement => {
	const node = document.createElement('div')

	node.className = 'so-test-leaving'
	node.dataset.open = 'true'
	node.style.cssText = 'width: 100px; height: 100px; opacity: 1; display: block'

	if (transition) {
		node.style.transition = `opacity ${DURATION}ms, display ${DURATION}ms allow-discrete`
	}

	document.body.append(node)

	return node
}

/** Close the node as a layer with a theme closes it: `data-open` and the closed style. */
const close = (node: HTMLElement): void => {
	node.dataset.open = 'false'
	node.style.opacity = '0'
	node.style.display = 'none'
}

/**
 * The action: for two frames the node is open, then it closes, and the action
 * returns three times later than the transition — when the node is long gone.
 */
const lateClose = (node: HTMLElement) => async (): Promise<void> => {
	await nextFrame()
	await nextFrame()
	close(node)
	await delay(DURATION * 3)

	// A look after the action would catch nothing anymore — otherwise the guard is empty
	expect(getComputedStyle(node).display, 'к концу действия узел исчез').toBe('none')
}

/** The delay and the duration of the `::before` transition, ms. */
const PSEUDO_DELAY = 100
const PSEUDO_DURATION = 100

/**
 * A node whose `data-on` flag lights `::before` up by a transition with a
 * delay, and the node itself by one without. The rules are a style sheet
 * inside the node: a pseudo-element has no inline style, and the sheet leaves
 * with the node. The node's style is computed before returning — without a
 * previous style a transition has nothing to start from.
 */
const mountPseudo = (): HTMLElement => {
	const sheet = document.createElement('style')
	const node = document.createElement('div')

	sheet.textContent = `
		.so-test-pseudo { opacity: 0.5; transition: opacity ${PSEUDO_DURATION}ms }
		.so-test-pseudo[data-on='true'] { opacity: 1 }
		.so-test-pseudo::before {
			content: '';
			display: block;
			inline-size: 10px;
			block-size: 10px;
			opacity: 0;
			transition: opacity ${PSEUDO_DURATION}ms ${PSEUDO_DELAY}ms;
		}
		.so-test-pseudo[data-on='true']::before { opacity: 1 }
	`
	node.className = 'so-test-pseudo'
	node.append(sheet)
	document.body.append(node)

	expect(getComputedStyle(node, '::before').opacity, 'до признака псевдоэлемента не видно').toBe(
		'0',
	)

	return node
}

afterEach(() => {
	for (const node of document.querySelectorAll('.so-test-leaving, .so-test-pseudo')) {
		node.remove()
	}
})

describe('whileLeaving', () => {
	it('ответ действия позже перехода: кадры ухода застаны, открытых среди них нет', async () => {
		const node = mount(true)
		const states: Array<string | undefined> = []
		const seen = await whileLeaving(node, lateClose(node), () => {
			states.push(node.dataset.open)
		})

		expect(seen, 'кадров на экране после закрытия').toBeGreaterThan(1)
		expect(states, 'check видит только закрытый узел').toEqual(
			Array.from({ length: seen }, () => 'false'),
		)
	})

	it('закрытие без перехода — ни одного кадра на экране', async () => {
		const node = mount(false)
		let checks = 0
		const seen = await whileLeaving(node, lateClose(node), () => {
			checks += 1
		})

		expect(seen).toBe(0)
		expect(checks).toBe(0)
	})

	it('узел до действия не открыт — ошибка, и действие не идёт', async () => {
		const node = mount(true)
		let acted = false

		node.dataset.open = 'false'

		await expect(
			whileLeaving(
				node,
				async () => {
					acted = true
				},
				() => {},
			),
		).rejects.toThrow('до действия узел не открыт')
		expect(acted).toBe(false)
	})

	it('ошибку check помощник бросает, когда действие кончилось', async () => {
		const node = mount(true)
		let finished = false

		// The rejection is caught when it comes: so it shows whether the action was
		// over by then
		const outcome = await whileLeaving(
			node,
			async () => {
				await lateClose(node)()
				finished = true
			},
			() => {
				throw new Error('проверка не прошла')
			},
		).then(
			() => 'прошло',
			(error: unknown) => ({ error, finished }),
		)

		expect(outcome).toEqual({ error: new Error('проверка не прошла'), finished: true })
	})
})

describe('pausedPseudoTransition', () => {
	it('ответ действия позже перехода: переход псевдоэлемента пойман на паузе недоигранным', async () => {
		const node = mountPseudo()
		const transition = await pausedPseudoTransition(node, '::before', 'opacity', async () => {
			node.dataset.on = 'true'
			await delay((PSEUDO_DELAY + PSEUDO_DURATION) * 3)
		})

		// The pseudo-element's, not the node's: the node's transition has no delay
		expect(delayOf(transition)).toBe(PSEUDO_DELAY)
		expect(transition.playState).toBe('paused')
		// Without the pause the transition would have played out long before the
		// action's end
		expect(Number(transition.currentTime)).toBeLessThan(PSEUDO_DELAY + PSEUDO_DURATION)
	})

	it('действие перехода не завело — ошибка сразу после действия, а не таймаут', async () => {
		const node = mountPseudo()

		await expect(
			pausedPseudoTransition(node, '::before', 'opacity', async () => {}),
		).rejects.toThrow('::before opacity: перехода не было')
	})
})

describe('pausedTransitions', () => {
	it('ответ действия позже перехода: переходы узла пойманы на паузе с начала, узел на экране', async () => {
		const node = mount(true)
		const transitions = await pausedTransitions(node, async () => {
			await nextFrame()
			close(node)
			await delay(DURATION * 3)
		})

		expect([...transitions.keys()].sort()).toEqual(['display', 'opacity'])

		for (const transition of transitions.values()) {
			expect(transition.playState).toBe('paused')
			// Caught at the start: without the pause the transition would have played
			// out long before the action's end
			expect(Number(transition.currentTime)).toBeLessThan(DURATION / 2)
		}

		// `display` is paused too: the closed node stays on screen at any moment the
		// test chooses
		expect(getComputedStyle(node).display).toBe('block')
	})

	it('действие переходов узла не завело — ошибка после действия, а не таймаут', async () => {
		const node = mount(false)

		await expect(pausedTransitions(node, async () => close(node))).rejects.toThrow(
			'после действия переходов у самого узла нет',
		)
	})
})
