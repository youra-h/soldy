/**
 * Сторож помощника `whileLeaving` (`transitions.ts`) — без темы: узел со своим
 * переходом прозрачности и `display` (`allow-discrete`) в инлайновом стиле и с
 * `data-open`, как у слоя.
 *
 * Помощник смотрит кадры с начала действия, а не после него: ответ
 * `userEvent` и команд идёт кругом RPC и под нагрузкой приходит позже, чем
 * узел исчезает. Здесь действие так и устроено — закрывает узел и
 * возвращается, когда узел давно исчез, — и кадры ухода помощник всё равно
 * застаёт. Кадры до закрытия в `check` не попадают, а ошибку `check` помощник
 * бросает только после конца действия.
 */

import { describe, it, expect, afterEach } from 'vitest'

import { whileLeaving } from './transitions'

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

afterEach(() => {
	for (const node of document.querySelectorAll('.so-test-leaving')) node.remove()
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
