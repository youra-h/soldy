/**
 * Сторож помощников `whileLeaving` и `pausedPseudoTransition`
 * (`transitions.ts`) — без темы.
 *
 * Помощники смотрят переход с начала действия, а не после него: ответ
 * `userEvent` и команд идёт кругом RPC и под нагрузкой приходит позже, чем
 * узел исчезает или переход доигрывает. Здесь действие так и устроено —
 * возвращается втрое позже перехода, — и помощник всё равно его застаёт.
 *
 * `whileLeaving` — на узле со своим переходом прозрачности и `display`
 * (`allow-discrete`) в инлайновом стиле и с `data-open`, как у слоя: кадры
 * ухода застаны, кадры до закрытия в `check` не попадают, а ошибку `check`
 * помощник бросает только после конца действия.
 *
 * `pausedPseudoTransition` — на узле, у которого признак зажигает `::before`
 * переходом с задержкой, а сам узел — переходом без неё: переход пойман на
 * паузе недоигранным, и он псевдоэлемента, а не узла. Не завело действие
 * перехода — ошибка сразу после действия, а не таймаут теста.
 */

import { describe, it, expect, afterEach } from 'vitest'

import { delayOf, pausedPseudoTransition, whileLeaving } from './transitions'

/** Длительность перехода закрытия у узла, мс. */
const DURATION = 100

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Открытый узел на странице — с переходом закрытия или без него. */
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

/** Закрыть узел, как его закрывает слой с темой: `data-open` и стиль закрытого. */
const close = (node: HTMLElement): void => {
	node.dataset.open = 'false'
	node.style.opacity = '0'
	node.style.display = 'none'
}

/**
 * Действие: два кадра узел открыт, потом закрывается, а возвращается
 * действие втрое позже перехода — когда узел давно исчез.
 */
const lateClose = (node: HTMLElement) => async (): Promise<void> => {
	await nextFrame()
	await nextFrame()
	close(node)
	await delay(DURATION * 3)

	// Взгляд после действия уже ничего бы не застал — иначе сторож пуст
	expect(getComputedStyle(node).display, 'к концу действия узел исчез').toBe('none')
}

/** Задержка и длительность перехода у `::before`, мс. */
const PSEUDO_DELAY = 100
const PSEUDO_DURATION = 100

/**
 * Узел, у которого признак `data-on` зажигает `::before` переходом с
 * задержкой, а сам узел — переходом без неё. Правила — листом стилей внутри
 * узла: у псевдоэлемента инлайнового стиля нет, а уходит лист вместе с узлом.
 * Стиль узла посчитан до возврата — без прежнего стиля переходу не с чего
 * начаться.
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

		// Отказ ловится в момент прихода: так видно, кончилось ли к нему действие
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

		// Псевдоэлемента, а не узла: у перехода узла задержки нет
		expect(delayOf(transition)).toBe(PSEUDO_DELAY)
		expect(transition.playState).toBe('paused')
		// Без паузы к концу действия переход давно доиграл бы
		expect(Number(transition.currentTime)).toBeLessThan(PSEUDO_DELAY + PSEUDO_DURATION)
	})

	it('действие перехода не завело — ошибка сразу после действия, а не таймаут', async () => {
		const node = mountPseudo()

		await expect(
			pausedPseudoTransition(node, '::before', 'opacity', async () => {}),
		).rejects.toThrow('::before opacity: перехода не было')
	})
})
