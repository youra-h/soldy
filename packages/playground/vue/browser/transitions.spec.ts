/**
 * The guard of the helpers `whileLeaving`, `pausedPseudoTransition` and
 * `pausedTransitions` (`transitions.ts`) — without a theme.
 *
 * The helpers watch a transition from the action's start, not after it: the
 * response of `userEvent` and commands goes over an RPC round trip and under
 * load comes later than the node disappears or the transition plays out. Here
 * the action is made so — it returns once the transition would have played
 * out, — and the helper still catches it. Under load frames come rarely too:
 * where it matters, the page is kept busy after the closing (`stall`), and the
 * next frame comes after the transition's end.
 *
 * `whileLeaving` — on a node with its own opacity and `display` transition
 * (`allow-discrete`) in the inline style and with `data-open`, like a layer's:
 * `check` runs at every moment of the leaving, with the node closed and on
 * screen and its opacity lower at each next moment, and after the helper the
 * node is gone. A closing without a transition is an error after the action,
 * not the test's timeout, and an error of `check` comes out with the node's
 * transitions played out — no layer is left paused.
 *
 * `pausedPseudoTransition` — on a node whose flag lights `::before` up by a
 * transition with a delay, and the node itself by one without: the transition
 * is caught paused before it has played out, and it is the pseudo-element's,
 * not the node's. The action started no transition — an error right after the
 * action, not the test's timeout.
 *
 * `pausedTransitions` — on the same node as `whileLeaving`: its own transitions
 * are caught paused from their start, `display` among them, so the closed node
 * stays on screen — also when the next frame comes after their end. The action
 * started no own transition — an error after the action, not the test's
 * timeout.
 */

import { describe, it, expect, afterEach } from 'vitest'

import {
	delayOf,
	MOMENTS,
	pausedPseudoTransition,
	pausedTransitions,
	whileLeaving,
} from './transitions'

/** The node's closing transition duration, ms. */
const DURATION = 100

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Keep the page busy for `ms` — as under load: no frame comes meanwhile. The
 * microtasks queued so far run first, as they do after a change of the page.
 */
const stall = async (ms: number): Promise<void> => {
	await Promise.resolve()

	const end = performance.now() + ms

	while (performance.now() < end) {
		// Busy: the next frame waits
	}
}

/**
 * An open node on the page — with a closing transition or without one. Its
 * style is computed before returning: without a previous style a transition
 * has nothing to start from.
 */
const mount = (transition: boolean): HTMLElement => {
	const node = document.createElement('div')

	node.className = 'so-test-leaving'
	node.dataset.open = 'true'
	node.style.cssText = 'width: 100px; height: 100px; opacity: 1; display: block'

	if (transition) {
		node.style.transition = `opacity ${DURATION}ms, display ${DURATION}ms allow-discrete`
	}

	document.body.append(node)

	expect(getComputedStyle(node).opacity, 'до закрытия узел виден').toBe('1')

	return node
}

/** Close the node as a layer with a theme closes it: `data-open` and the closed style. */
const close = (node: HTMLElement): void => {
	node.dataset.open = 'false'
	node.style.opacity = '0'
	node.style.display = 'none'
}

/**
 * The action: for two frames the node is open, then it closes together with a
 * twin — a node with the same closing transition, which the helper doesn't
 * watch. The page stays busy for three transitions' time, and the action
 * returns once the twin is gone. Without the pause the node would be gone too,
 * and a look after the action would catch nothing: otherwise the guard is
 * empty.
 */
const lateClose = (node: HTMLElement) => async (): Promise<void> => {
	const twin = mount(true)

	await nextFrame()
	await nextFrame()
	close(node)
	close(twin)
	await stall(DURATION * 3)

	await expect
		.poll(() => getComputedStyle(twin).display, { message: 'к концу действия двойник исчез' })
		.toBe('none')
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
	it('ответ действия позже перехода: мгновения ухода застаны, узел в них закрыт и на экране', async () => {
		const node = mount(true)
		const moments: Array<{ open: string | undefined; display: string; opacity: number }> = []

		await whileLeaving(node, lateClose(node), () => {
			const style = getComputedStyle(node)

			moments.push({
				open: node.dataset.open,
				display: style.display,
				opacity: Number(style.opacity),
			})
		})

		expect(moments, 'проверка — в каждом мгновении').toHaveLength(MOMENTS.length)

		moments.forEach(({ open, display, opacity }, index) => {
			expect(open, `мгновение ${index}: узел закрыт`).toBe('false')
			expect(display, `мгновение ${index}: узел на экране`).toBe('block')

			// The moments are different points of the fade, not one look repeated
			if (index > 0) {
				expect(opacity, `мгновение ${index}: прозрачность ниже прошлой`).toBeLessThan(
					moments[index - 1].opacity,
				)
			}
		})

		expect(getComputedStyle(node).display, 'после помощника узел исчез').toBe('none')
	})

	it('закрытие без перехода — ошибка после действия, а не таймаут', async () => {
		const node = mount(false)
		let checks = 0

		await expect(
			whileLeaving(
				node,
				async () => close(node),
				() => {
					checks += 1
				},
			),
		).rejects.toThrow('после действия переходов у самого узла нет')
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

	it('ошибку проверки помощник бросает, а переходы узла доиграны', async () => {
		const node = mount(true)

		await expect(
			whileLeaving(node, lateClose(node), () => {
				throw new Error('проверка не прошла')
			}),
		).rejects.toThrow('проверка не прошла')

		// Played out, not left paused: the node is gone at once, without a frame
		expect(node.getAnimations(), 'переходов на паузе не осталось').toEqual([])
		expect(getComputedStyle(node).display, 'узел исчез').toBe('none')
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

	/**
	 * WebKit counts a transition from the frame before its style change, and
	 * under load the next frame — with the transition's own `transitionrun` —
	 * came after the transition's end. Here the page is busy after the closing
	 * for three transitions' time.
	 */
	it('следующий кадр позже конца перехода: переходы узла пойманы на паузе с начала', async () => {
		const node = mount(true)
		const transitions = await pausedTransitions(node, async () => {
			await nextFrame()
			close(node)
			await stall(DURATION * 3)
		})

		expect([...transitions.keys()].sort()).toEqual(['display', 'opacity'])

		for (const transition of transitions.values()) {
			expect(transition.playState).toBe('paused')
			expect(Number(transition.currentTime)).toBeLessThan(DURATION / 2)
		}
	})

	it('действие переходов узла не завело — ошибка после действия, а не таймаут', async () => {
		const node = mount(false)

		await expect(pausedTransitions(node, async () => close(node))).rejects.toThrow(
			'после действия переходов у самого узла нет',
		)
	})
})
