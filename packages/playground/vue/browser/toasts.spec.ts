/**
 * Toasts в настоящем браузере: раскладка темы, переходы и жест указателем.
 *
 * Место региона, стопку и зазоры раскладывает тема, без замеров, — jsdom их не
 * считает, и юнит-тесты (`ui/vue/__tests__/toasts.spec.ts`) видят только
 * классы и `data-*`. Здесь — что из них выходит на экране: регион у своего края
 * окна (логического — в RTL `start` справа), новый тост у края, зазор между
 * тостами и без зазора за последним, указатель мимо тостов — странице, а в
 * зазоре — тосту; новый тост въезжает переходом, закрытый гаснет и уходит из
 * документа, когда доиграл переходы, а без движения проявляется и гаснет на
 * месте.
 *
 * Жест — настоящей мышью: захват указателя и `touch-action` jsdom не
 * выполняет вовсе.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { page, userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick } from 'vue'
import { createEngineToasts } from '@soldy-ui/core'
import type { IToastsItem, IToastsProps, TToastInput, TToastsPlacement } from '@soldy-ui/core'
import { Toasts } from '@soldy-ui/vue'

import { setDir } from './directions'
import { reducedMotion } from './media'
import { settled, transitioning } from './transitions'

import '@soldy-ui/theme-oren'

/** Отступ региона от краёв окна в теме oren: `spacing * 4`. */
const OFFSET = 16

/** Зазор между тостами: `spacing * 3`. */
const GAP = 12

/** Ширина тоста: `22rem`. */
const WIDTH = 352

/** Допуск на субпиксельное округление координат. */
const EPSILON = 1

/** Окно прогона. */
const VIEWPORT = { width: 1000, height: 700 }

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Тосты в документе — места в списке; новый — первым. */
const items = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('.so-toasts-item')]

/** Плашка тоста — то, что видно. */
const card = (item: HTMLElement): HTMLElement => {
	const element = item.querySelector('.so-toasts-item__card')

	if (!(element instanceof HTMLElement)) throw new Error('плашки нет')

	return element
}

/** Ширина окна без полосы прокрутки: от неё регион и отступает. */
const viewportWidth = () => document.documentElement.clientWidth

/**
 * Регион с приложением и движком снаружи: тосты показываются кодом уже после
 * монтирования — так они въезжают, как у приложения. Длительность — ноль:
 * отсчёт таймера тесту не нужен.
 */
const mount = async (props: Partial<IToastsProps> = {}) => {
	const engine = createEngineToasts()

	render(
		defineComponent({
			render: () =>
				h('div', { class: 'so-test-page', style: 'padding: 40px; min-height: 100vh' }, [
					h(Toasts, { engine, duration: 0, ...props }, () => h('p', 'Приложение')),
				]),
		}),
	)

	await nextTick()
	await nextFrame()
	await nextFrame()

	/** Показать тосты по порядку и дождаться, пока доедут. */
	const show = async (...inputs: TToastInput[]): Promise<IToastsItem[]> => {
		const toasts = inputs.map((input) => {
			const toast = engine.extensions.toasts.show(input)

			if (!toast) throw new Error('тост не показан')

			return toast
		})

		await nextTick()
		await nextFrame()

		return toasts
	}

	/** Все переходы тостов доиграли. */
	const rest = async () => {
		await Promise.all(items().map(settled))
	}

	return { engine, show, rest }
}

beforeEach(async () => {
	document.documentElement.dataset.soTheme = 'oren'
	await page.viewport(VIEWPORT.width, VIEWPORT.height)
})

afterEach(async () => {
	cleanup()
	setDir(document.documentElement)
	await reducedMotion('no-preference')
})

describe('место', () => {
	/** Где должен стоять тост: край по вертикали и место в строке. */
	const CASES: readonly [TToastsPlacement, 'top' | 'bottom', 'left' | 'center' | 'right'][] = [
		['top-start', 'top', 'left'],
		['top', 'top', 'center'],
		['top-end', 'top', 'right'],
		['bottom-start', 'bottom', 'left'],
		['bottom', 'bottom', 'center'],
		['bottom-end', 'bottom', 'right'],
	]

	it.each(CASES)('%s: тост у своего края окна, с отступом', async (placement, edge, side) => {
		const { show, rest } = await mount({ placement })

		await show('Сохранено')
		await rest()

		const [item] = items()

		if (!item) throw new Error('тоста нет')

		const box = card(item).getBoundingClientRect()

		if (edge === 'top') expect(box.top).toBeCloseTo(OFFSET, 0)
		else expect(box.bottom).toBeCloseTo(VIEWPORT.height - OFFSET, 0)

		if (side === 'left') expect(box.left).toBeCloseTo(OFFSET, 0)
		if (side === 'right') expect(box.right).toBeCloseTo(viewportWidth() - OFFSET, 0)
		if (side === 'center') {
			expect(Math.abs((box.left + box.right) / 2 - viewportWidth() / 2)).toBeLessThan(EPSILON)
		}

		expect(box.width).toBeCloseTo(WIDTH, 0)
	})

	it('RTL: start и end меняются местами', async () => {
		setDir(document.documentElement, 'rtl')

		const { show, rest } = await mount({ placement: 'bottom-start' })

		await show('Сохранено')
		await rest()

		const [item] = items()

		if (!item) throw new Error('тоста нет')

		expect(card(item).getBoundingClientRect().right).toBeCloseTo(viewportWidth() - OFFSET, 0)
	})

	it('узкий экран: тост во всю ширину окна без отступов', async () => {
		await page.viewport(320, 600)

		const { show, rest } = await mount()

		await show('Сохранено')
		await rest()

		const [item] = items()

		if (!item) throw new Error('тоста нет')

		const box = card(item).getBoundingClientRect()

		expect(box.left).toBeCloseTo(OFFSET, 0)
		expect(box.right).toBeCloseTo(viewportWidth() - OFFSET, 0)
	})
})

describe('стопка', () => {
	it('новый тост — у края окна, между тостами — зазор', async () => {
		const { show, rest } = await mount()

		await show('Первый', 'Второй', 'Третий')
		await rest()

		const cards = items().map((item) => card(item).getBoundingClientRect())
		const [newest, middle, oldest] = cards

		if (!newest || !middle || !oldest) throw new Error('тостов меньше трёх')

		expect(items().map((item) => item.textContent?.trim())).toEqual([
			'Третий',
			'Второй',
			'Первый',
		])
		// У нижнего края новый — внизу, стопка растёт вверх
		expect(newest.bottom).toBeCloseTo(VIEWPORT.height - OFFSET, 0)
		expect(newest.top - middle.bottom).toBeCloseTo(GAP, 0)
		expect(middle.top - oldest.bottom).toBeCloseTo(GAP, 0)
	})

	it('у последнего тоста зазора нет: место — ровно плашка', async () => {
		const { show, rest } = await mount()

		await show('Первый', 'Второй')
		await rest()

		const [newest, last] = items()

		if (!newest || !last) throw new Error('тостов меньше двух')

		const lastPlace = last.getBoundingClientRect()
		const lastCard = card(last).getBoundingClientRect()
		const newestPlace = newest.getBoundingClientRect()
		const newestCard = card(newest).getBoundingClientRect()

		expect(lastPlace.height).toBeCloseTo(lastCard.height, 0)
		expect(newestPlace.height).toBeCloseTo(newestCard.height + GAP, 0)
	})

	it('указатель мимо тостов — странице, в зазоре — тосту', async () => {
		const { show, rest } = await mount()

		await show('Первый', 'Второй')
		await rest()

		const region = document.querySelector('.so-toasts')
		const [newest, older] = items().map((item) => card(item).getBoundingClientRect())

		if (!region || !newest || !older) throw new Error('тостов меньше двух')

		// Левее стопки, на высоте нового тоста: регион во всю ширину, но мимо
		const beside = document.elementFromPoint(OFFSET + 8, newest.top + newest.height / 2)
		// Посередине зазора между тостами
		const between = document.elementFromPoint(
			(newest.left + newest.right) / 2,
			(older.bottom + newest.top) / 2,
		)

		expect(beside !== null && region.contains(beside)).toBe(false)
		expect(between?.closest('.so-toasts-item')).not.toBeNull()
	})

	it('видно не больше max: остальные ждут и приходят, когда место освободилось', async () => {
		const { show, rest } = await mount({ max: 2 })
		const texts = () => items().map((item) => item.textContent?.trim())
		const [, , newest] = await show('Первый', 'Второй', 'Третий')

		await rest()

		expect(texts()).toEqual(['Третий', 'Второй'])

		// Закрытый уходит после переходов — и ждавший возвращается
		newest?.close()

		await expect.poll(texts).toEqual(['Второй', 'Первый'])
	})
})

describe('появление и исчезание', () => {
	it('новый тост въезжает: место растёт, тост проявляется', async () => {
		const { engine } = await mount()

		engine.extensions.toasts.show('Сохранено')
		await nextTick()

		const [item] = items()

		if (!item) throw new Error('тоста нет')

		expect(transitioning(item)).toEqual(
			expect.arrayContaining(['opacity', 'grid-template-rows']),
		)
	})

	it('закрытый гаснет, уходит вбок и уходит из документа, когда доиграл переходы', async () => {
		const { show, rest } = await mount()
		const [toast] = await show('Сохранено')

		await rest()

		const [item] = items()

		if (!item || !toast) throw new Error('тоста нет')

		toast.close()
		await nextTick()

		expect(item.dataset.open).toBe('false')
		expect(getComputedStyle(item).pointerEvents).toBe('none')

		let frames = 0

		while (item.isConnected) {
			if (frames === 120) throw new Error('тост не ушёл за 120 кадров')

			frames += 1
			await nextFrame()
		}

		// Ушёл не сразу: переходы закрытия успели идти
		expect(frames).toBeGreaterThan(2)
	})

	it('без движения тост проявляется и гаснет на месте', async () => {
		await reducedMotion('reduce')

		const { show, rest, engine } = await mount()
		const [toast] = await show('Сохранено')
		const [item] = items()

		if (!item || !toast) throw new Error('тоста нет')

		expect(transitioning(item)).toEqual(['opacity'])

		await rest()

		const before = card(item).getBoundingClientRect()

		toast.close()
		await nextTick()

		expect(transitioning(item)).toEqual(['opacity'])
		expect(card(item).getBoundingClientRect().left).toBeCloseTo(before.left, 0)

		await expect.poll(() => engine.extensions.batch.items).toEqual([])
	})
})

describe('жест', () => {
	it('у бокового места тост смахивают к краю строки: закрыт и ушёл', async () => {
		const { show, rest } = await mount()
		const [toast] = await show('Сохранено')

		await rest()

		const [item] = items()

		if (!item || !toast) throw new Error('тоста нет')

		expect(getComputedStyle(item).touchAction).toBe('pan-y pinch-zoom')

		const box = card(item).getBoundingClientRect()
		const x = 40
		const y = box.height / 2

		await userEvent.dragAndDrop(card(item), card(item), {
			sourcePosition: { x, y },
			targetPosition: { x: x + 200, y },
			steps: 10,
			force: true,
		})

		await expect.poll(() => toast.open).toBe(false)
		await expect.poll(() => item.isConnected).toBe(false)
	})

	it('отпустили ближе четверти — тост возвращается на место', async () => {
		const { show, rest } = await mount()
		const [toast] = await show('Сохранено')

		await rest()

		const [item] = items()

		if (!item || !toast) throw new Error('тоста нет')

		const before = card(item).getBoundingClientRect()
		const x = 40
		const y = before.height / 2

		await userEvent.dragAndDrop(card(item), card(item), {
			sourcePosition: { x, y },
			targetPosition: { x: x + 40, y },
			steps: 20,
			force: true,
		})

		expect(toast.open).toBe(true)

		await expect
			.poll(() => Math.abs(card(item).getBoundingClientRect().left - before.left))
			.toBeLessThan(EPSILON)
	})
})
