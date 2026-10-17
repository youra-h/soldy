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
 *
 * Стопка (`layout: 'cascade'`) — тоже раскладка темы: передний у края, задние
 * уже и выглядывают на ступень, высота стопки — по переднему (`--so-toasts-front-height`
 * от поведения темы), фокус выводит тост вперёд без перестановки, колесо
 * листает стопку, а страница под ней не едет. Новый тост въезжает в стопку от
 * края окна на свою высоту, а прежний передний тем же временем и той же
 * кривой отходит на ступень, сразу за новым, и не схлопывается; переставленный
 * колесом назад проявляется на своём месте, без въезда, а без движения новый
 * только проявляется.
 *
 * Вид сообщения — тон значка в начале строки, а плашка и заголовок у всех видов
 * одни: что тон доходит до рисунка значка, видно только на вычисленном стиле.
 * Пока тост ждёт, на месте значка бежит кольцо — по кругу глифа, и текст не
 * сдвигается, когда кольцо сменилось значком.
 */

import { describe, it, expect, beforeEach, afterEach, onTestFinished } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { page, userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick } from 'vue'
import { createEngineToasts } from '@soldy-ui/core'
import type { IToastsItem, IToastsProps, TToastInput, TToastsPlacement } from '@soldy-ui/core'
import { Toasts } from '@soldy-ui/vue'

import { setDir } from './directions'
import { reducedMotion } from './media'
import {
	durationOf,
	easingOf,
	ownTransitionRuns,
	settled,
	transitionEvents,
	transitionOf,
	transitioning,
} from './transitions'

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

/** Часть тоста по классу; нет её — тест падает здесь. */
const part = (item: HTMLElement, name: string): HTMLElement => {
	const element = item.querySelector(`.so-toasts-item__${name}`)

	if (!(element instanceof HTMLElement)) throw new Error(`${name}: части нет`)

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

describe('части тоста', () => {
	it('пустые описание и своё содержимое места не занимают; значок и крестик — по центру строки', async () => {
		const { show, rest } = await mount()

		await show('Сохранено')
		await rest()

		const [item] = items()

		if (!item) throw new Error('тоста нет')

		expect(getComputedStyle(part(item, 'description')).display).toBe('none')
		expect(getComputedStyle(part(item, 'content')).display).toBe('none')
		// Значок, текст и крестик — в одной строке: значок перед текстом, крестик
		// после, оба по центру строки текста
		const icon = part(item, 'icon').getBoundingClientRect()
		const text = part(item, 'text').getBoundingClientRect()
		const close = part(item, 'close').getBoundingClientRect()
		const middle = (text.top + text.bottom) / 2

		expect(icon.width).toBeGreaterThan(0)
		expect(icon.right).toBeLessThanOrEqual(text.left + EPSILON)
		expect(Math.abs((icon.top + icon.bottom) / 2 - middle)).toBeLessThan(EPSILON)
		expect(Math.abs((close.top + close.bottom) / 2 - middle)).toBeLessThan(EPSILON)
	})

	it('у текста в несколько строк значок — по центру первой', async () => {
		const { show, rest } = await mount()

		await show({
			text: 'Черновик сохранён, но письмо не ушло: адрес получателя не найден, проверьте его',
			type: 'warning',
		})
		await rest()

		const [item] = items()

		if (!item) throw new Error('тоста нет')

		const icon = part(item, 'icon').getBoundingClientRect()
		const title = part(item, 'text')
		const text = title.getBoundingClientRect()
		const line = parseFloat(getComputedStyle(title).lineHeight)

		// Текст и правда в несколько строк — иначе первая строка и есть весь текст
		expect(text.height).toBeGreaterThan(line * 1.5)
		expect(Math.abs((icon.top + icon.bottom) / 2 - (text.top + line / 2))).toBeLessThan(EPSILON)
	})

	it('описание — под текстом, тем же столбцом', async () => {
		const { show, rest } = await mount()

		await show({ text: 'Отправлено', description: 'Письмо ушло адресату' })
		await rest()

		const [item] = items()

		if (!item) throw new Error('тоста нет')

		const text = part(item, 'text').getBoundingClientRect()
		const description = part(item, 'description').getBoundingClientRect()

		expect(description.top).toBeGreaterThanOrEqual(text.bottom - EPSILON)
		expect(description.left).toBeCloseTo(text.left, 0)
	})
})

describe('вид', () => {
	/** Рисунок в коробке значка — `svg` иконки; нет его — тест падает здесь. */
	const glyph = (item: HTMLElement): SVGElement => {
		const element = part(item, 'icon').querySelector('svg')

		if (!(element instanceof SVGElement)) throw new Error('рисунка значка нет')

		return element
	}

	it('плашка и заголовок у пяти видов одни, а тон значка у каждого свой и доходит до рисунка', async () => {
		const { show, rest } = await mount({ max: 5 })

		await show(
			'Обычное',
			{ text: 'Сведения', type: 'info' },
			{ text: 'Готово', type: 'success' },
			{ text: 'Внимание', type: 'warning' },
			{ text: 'Ошибка', type: 'error' },
		)
		await rest()

		const shown = items()
		const style = (element: Element) => getComputedStyle(element)

		expect(shown).toHaveLength(5)
		// Под вид плашка не подкрашивается: поверхность, кромка и тень — одни
		expect(new Set(shown.map((item) => style(card(item)).backgroundColor)).size).toBe(1)
		expect(new Set(shown.map((item) => style(card(item)).boxShadow)).size).toBe(1)
		expect(new Set(shown.map((item) => style(part(item, 'text')).color)).size).toBe(1)
		// Вид говорит значок — тоном, своим у каждого из пяти
		expect(new Set(shown.map((item) => style(part(item, 'icon')).color)).size).toBe(5)

		for (const item of shown) {
			expect(style(glyph(item)).fill).toBe(style(part(item, 'icon')).color)
		}
	})

	it('кольцо ожидания — по кругу значка, и текст не сдвигается, когда кольцо сменилось значком', async () => {
		const { show, rest } = await mount()
		const [toast] = await show({ text: 'Сохраняем…', type: 'success', loading: true })

		await rest()

		const [item] = items()

		if (!item || !toast) throw new Error('тоста нет')

		const box = part(item, 'icon').getBoundingClientRect()
		const spinner = part(item, 'icon').querySelector('.so-progress-spinner')

		if (!(spinner instanceof HTMLElement)) throw new Error('кольца нет')

		const ring = spinner.getBoundingClientRect()
		const before = part(item, 'text').getBoundingClientRect()

		// Круг значков Material — 800 из 960 единиц коробки, 5/6 её стороны
		expect(ring.width).toBeCloseTo((box.width * 5) / 6, 0)
		expect(ring.height).toBeCloseTo((box.height * 5) / 6, 0)
		expect((ring.left + ring.right) / 2).toBeCloseTo((box.left + box.right) / 2, 0)
		expect((ring.top + ring.bottom) / 2).toBeCloseTo((box.top + box.bottom) / 2, 0)

		toast.loading = false
		await nextTick()
		await nextFrame()

		const after = part(item, 'text').getBoundingClientRect()

		expect(part(item, 'icon').querySelector('.so-progress-spinner')).toBeNull()
		expect(glyph(item).getBoundingClientRect().width).toBeCloseTo(box.width, 0)
		expect(part(item, 'icon').getBoundingClientRect().width).toBeCloseTo(box.width, 1)
		expect(after.left).toBeCloseTo(before.left, 1)
		expect(after.top).toBeCloseTo(before.top, 1)
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

describe('стопка', () => {
	/** На сколько задний выглядывает из-под стоящего перед ним: зазор столбца. */
	const PEEK = GAP

	/** На сколько задний уже на каждой ступени. */
	const NARROW = 0.05

	/** Середина плашки по строке. */
	const middle = (box: DOMRect) => (box.left + box.right) / 2

	/** Тексты тостов по порядку документа — порядок стопки, передний первым. */
	const texts = () =>
		items().map((item) => item.querySelector('.so-toasts-item__text')?.textContent)

	/** Тосты по порядку; их меньше `count` — тест падает здесь. */
	const take = (count: number): HTMLElement[] => {
		const found = items()

		if (found.length < count) throw new Error(`тостов меньше ${count}`)

		return found
	}

	/**
	 * Узел в конце документа — за регионом тостов, который телепортирован туда
	 * раньше. Снимается после теста.
	 */
	const append = <T extends HTMLElement>(element: T): T => {
		document.body.append(element)
		onTestFinished(() => element.remove())

		return element
	}

	/** Страница длиннее окна: её есть куда прокрутить. */
	const scrollable = () => {
		const spacer = append(document.createElement('div'))

		spacer.style.height = '200vh'
	}

	/**
	 * Переходы стопки доиграли. Высоту задних поведение темы пишет, когда
	 * передний сменился, и переход высоты, начатый сменой ступени, сменяется
	 * новым: прерванный переход `finished` отклоняет. Ждём, пока новых нет.
	 */
	const still = async () => {
		for (;;) {
			const running = items().flatMap((item) => item.getAnimations())

			if (running.length === 0) return

			await Promise.allSettled(running.map((animation) => animation.finished))
		}
	}

	it('передний — у края окна, задние уже и выглядывают на ступень к дальней стороне', async () => {
		const { show } = await mount({ layout: 'cascade' })

		await show('Первый', 'Второй', 'Третий')
		await still()

		const [front, next, last] = take(3).map((item) => card(item).getBoundingClientRect())

		if (!front || !next || !last) throw new Error('тостов меньше трёх')

		expect(texts()).toEqual(['Третий', 'Второй', 'Первый'])
		expect(front.bottom).toBeCloseTo(VIEWPORT.height - OFFSET, 0)
		expect(front.right).toBeCloseTo(viewportWidth() - OFFSET, 0)
		expect(front.width).toBeCloseTo(WIDTH, 0)
		expect(front.top - next.top).toBeCloseTo(PEEK, 0)
		expect(next.top - last.top).toBeCloseTo(PEEK, 0)
		expect(next.width).toBeCloseTo(WIDTH * (1 - NARROW), 0)
		expect(last.width).toBeCloseTo(WIDTH * (1 - 2 * NARROW), 0)
		expect(Math.abs(middle(next) - middle(front))).toBeLessThan(EPSILON)
		expect(Math.abs(middle(last) - middle(front))).toBeLessThan(EPSILON)

		// Передний сверху: в его середине — он
		const hit = document.elementFromPoint(middle(front), (front.top + front.bottom) / 2)

		expect(hit?.closest('.so-toasts-item')).toBe(take(1)[0])
	})

	it('высота стопки — по переднему: задний выше переднего не торчит', async () => {
		const { show } = await mount({ layout: 'cascade' })

		await show(
			{
				text: 'Высокий',
				description: 'Описание в несколько строк, чтобы тост стал заметно выше переднего',
			},
			'Низкий',
		)
		await still()

		const [front, back] = take(2)
		const region = document.querySelector<HTMLElement>('.so-toasts')
		const list = region?.querySelector('.so-toasts__list')
		const body = back?.querySelector('.so-toasts-item__body')

		if (!front || !back || !region || !list || !body) throw new Error('разметки нет')

		const frontHeight = front.getBoundingClientRect().height

		// Своё содержимое заднего выше переднего — иначе проверять нечего
		expect(Number.parseFloat(getComputedStyle(body).height)).toBeGreaterThan(frontHeight)
		expect(getComputedStyle(back).height).toBe(getComputedStyle(front).height)
		expect(
			Number.parseFloat(region.style.getPropertyValue('--so-toasts-front-height')),
		).toBeCloseTo(frontHeight, 0)
		expect(list.getBoundingClientRect().height).toBeCloseTo(frontHeight, 0)
		expect(
			card(front).getBoundingClientRect().top - card(back).getBoundingClientRect().top,
		).toBeCloseTo(PEEK, 0)
	})

	it('у верхнего края задние выглядывают вниз', async () => {
		const { show } = await mount({ layout: 'cascade', placement: 'top' })

		await show('Первый', 'Второй')
		await still()

		const [front, back] = take(2).map((item) => card(item).getBoundingClientRect())

		if (!front || !back) throw new Error('тостов меньше двух')

		expect(front.top).toBeCloseTo(OFFSET, 0)
		expect(back.bottom - front.bottom).toBeCloseTo(PEEK, 0)
		expect(Math.abs(middle(back) - middle(front))).toBeLessThan(EPSILON)
	})

	/**
	 * Второй тост въезжает в стопку: первый уже стоит, второй показан кодом.
	 * Переход сдвига нового — въезд — встаёт на паузу в самом начале: так видно,
	 * откуда тост въезжает.
	 */
	const arrive = async (props: Partial<IToastsProps> = {}) => {
		const { show, engine } = await mount({ layout: 'cascade', ...props })

		await show('Первый')
		await still()

		engine.extensions.toasts.show('Второй')
		await nextTick()

		const [arriving, previous] = take(2)

		if (!arriving || !previous) throw new Error('тостов меньше двух')

		const entry = transitionOf(arriving, 'translate')

		entry.pause()
		entry.currentTime = 0

		return { arriving, previous, entry }
	}

	it('новый въезжает от края окна на свою высоту, прежний передний сразу за ним отходит тем же переходом', async () => {
		const { arriving, previous, entry } = await arrive()

		expect(transitioning(arriving)).toEqual(expect.arrayContaining(['translate', 'opacity']))
		// Ниже своего места на свою высоту: верх — там, где встанет низ, у края окна
		expect(card(arriving).getBoundingClientRect().top).toBeCloseTo(VIEWPORT.height - OFFSET, 0)
		// Прежний передний — уже за новым, в том же кадре
		expect(Number(getComputedStyle(previous).zIndex)).toBeLessThan(
			Number(getComputedStyle(arriving).zIndex),
		)

		for (const property of ['translate', 'scale']) {
			const step = transitionOf(previous, property)

			expect(durationOf(step), property).toBe(durationOf(entry))
			expect(easingOf(step), property).toBe(easingOf(entry))
		}
	})

	it('у верхнего края новый въезжает сверху', async () => {
		const { arriving } = await arrive({ placement: 'top' })

		expect(card(arriving).getBoundingClientRect().bottom).toBeCloseTo(OFFSET, 0)
	})

	/**
	 * Ушедший назад встаёт в высоту переднего из переменной поведения темы, а
	 * не идёт к ней переходом от `auto`: под `contain: size` заднего `auto` —
	 * ноль, и прежний передний схлопывался в полоску у края, пока новый
	 * въезжал. Высота места — без сжатия (`offsetHeight`), каждым кадром.
	 */
	it('прежний передний не схлопывается: высота идёт от своей к высоте нового переднего', async () => {
		const { show, engine } = await mount({ layout: 'cascade' })

		await show({
			text: 'Высокий',
			description: 'Описание в несколько строк, чтобы тост стал заметно выше нового',
		})
		await still()

		const [previous] = take(1)

		if (!previous) throw new Error('тоста нет')

		const own = previous.offsetHeight

		engine.extensions.toasts.show('Низкий')
		await nextTick()

		const heights: number[] = []

		do {
			heights.push(previous.offsetHeight)
			await nextFrame()
		} while (items().some((item) => item.getAnimations().length > 0))

		const [front] = take(1)

		if (!front) throw new Error('тоста нет')

		// Новый ниже прежнего — иначе проверять нечего
		expect(front.offsetHeight).toBeLessThan(own)
		expect(heights[0]).toBeCloseTo(own, 0)
		expect(Math.min(...heights)).toBeGreaterThanOrEqual(front.offsetHeight - EPSILON)
		expect(previous.offsetHeight).toBeCloseTo(front.offsetHeight, 0)
	})

	it('без движения новый только проявляется на месте, а прежний встаёт на ступень сразу', async () => {
		await reducedMotion('reduce')

		const { show, engine } = await mount({ layout: 'cascade' })

		await show('Первый')
		await still()

		engine.extensions.toasts.show('Второй')
		await nextTick()

		const [arriving, previous] = take(2)

		if (!arriving || !previous) throw new Error('тостов меньше двух')

		expect(transitioning(arriving)).toEqual(['opacity'])
		expect(transitioning(previous).filter((property) => property !== 'opacity')).toEqual([])
		expect(card(arriving).getBoundingClientRect().bottom).toBeCloseTo(
			VIEWPORT.height - OFFSET,
			0,
		)
	})

	it('RTL: стопка у своего края, задние — по середине переднего', async () => {
		setDir(document.documentElement, 'rtl')

		const { show } = await mount({ layout: 'cascade', placement: 'bottom-start' })

		await show('Первый', 'Второй')
		await still()

		const [front, back] = take(2).map((item) => card(item).getBoundingClientRect())

		if (!front || !back) throw new Error('тостов меньше двух')

		expect(front.right).toBeCloseTo(viewportWidth() - OFFSET, 0)
		expect(Math.abs(middle(back) - middle(front))).toBeLessThan(EPSILON)
	})

	it('содержимое заднего закрыто его плашкой, а нажатие по краю достаётся тосту', async () => {
		const { show } = await mount({ layout: 'cascade' })

		await show('Первый', 'Второй')
		await still()

		const [front, back] = take(2)

		if (!front || !back) throw new Error('тостов меньше двух')

		const peek = card(back).getBoundingClientRect()

		expect(getComputedStyle(card(back), '::after').opacity).toBe('1')
		expect(getComputedStyle(card(front), '::after').opacity).toBe('0')
		expect(document.elementFromPoint(middle(peek), peek.top + PEEK / 2)).toBe(back)
	})

	it('колесо над стопкой: передний уходит назад переходом, страница не едет', async () => {
		const { show } = await mount({ layout: 'cascade' })

		scrollable()
		await show('Первый', 'Второй', 'Третий')
		await still()

		const [front, next] = take(2)

		if (!front || !next) throw new Error('тостов меньше двух')

		const moved = ownTransitionRuns(front)

		await userEvent.wheel(card(front), { delta: { y: 100 } })
		await nextTick()

		expect(texts()).toEqual(['Второй', 'Первый', 'Третий'])
		expect(transitioning(next)).toEqual(expect.arrayContaining(['translate', 'scale']))
		expect(window.scrollY).toBe(0)

		// Ушедший назад — узел, вставленный заново: он проявляется на своём
		// месте, а не въезжает от края, как новый
		await transitionEvents()

		expect(moved).toEqual(['opacity'])

		await still()

		expect(card(next).getBoundingClientRect().bottom).toBeCloseTo(VIEWPORT.height - OFFSET, 0)
	})

	it('столбцом колесо над тостом — странице', async () => {
		const { show } = await mount()

		scrollable()
		await show('Первый', 'Второй')
		await still()

		const [front] = take(1)

		if (!front) throw new Error('тоста нет')

		await userEvent.wheel(card(front), { delta: { y: 100 } })

		await expect.poll(() => window.scrollY).toBeGreaterThan(0)
		expect(texts()).toEqual(['Второй', 'Первый'])
	})

	it('фокус выводит задний вперёд без перестановки, и Tab идёт по тостам и из стопки', async () => {
		const { show } = await mount({ layout: 'cascade' })
		const after = append(document.createElement('button'))

		after.textContent = 'После региона'
		await show('Первый', 'Второй')
		await still()

		const [front, back] = take(2)

		if (!front || !back) throw new Error('тостов меньше двух')

		front.focus()
		// Крестик переднего, потом задний
		await userEvent.tab()
		await userEvent.tab()

		expect(document.activeElement).toBe(back)

		await still()

		const box = card(back).getBoundingClientRect()

		expect(texts()).toEqual(['Второй', 'Первый'])
		expect(box.bottom).toBeCloseTo(VIEWPORT.height - OFFSET, 0)
		expect(box.width).toBeCloseTo(WIDTH, 0)
		expect(
			document
				.elementFromPoint(middle(box), (box.top + box.bottom) / 2)
				?.closest('.so-toasts-item'),
		).toBe(back)
		// Передний отошёл на ступень назад
		expect(box.top - card(front).getBoundingClientRect().top).toBeCloseTo(PEEK, 0)

		// Крестик заднего, потом — из стопки, к тому, что за регионом
		await userEvent.tab()
		await userEvent.tab()

		expect(document.activeElement).toBe(after)
	})

	it('закрытый передний уходит поверх, а следующий сразу встаёт вперёд', async () => {
		const { show } = await mount({ layout: 'cascade' })
		const [, toast] = await show('Первый', 'Второй')

		await still()

		const [front, next] = take(2)

		if (!toast || !front || !next) throw new Error('тостов меньше двух')

		toast.close()
		await nextTick()

		expect(getComputedStyle(front).zIndex).toBe('1')

		await still()

		expect(card(next).getBoundingClientRect().bottom).toBeCloseTo(VIEWPORT.height - OFFSET, 0)
		expect(card(next).getBoundingClientRect().width).toBeCloseTo(WIDTH, 0)

		await expect.poll(() => front.isConnected).toBe(false)
	})

	it('без движения стопка листается на месте: переходит одна прозрачность', async () => {
		await reducedMotion('reduce')

		const { show } = await mount({ layout: 'cascade' })

		await show('Первый', 'Второй')
		await still()

		const [front, next] = take(2)

		if (!front || !next) throw new Error('тостов меньше двух')

		await userEvent.wheel(card(front), { delta: { y: 100 } })
		await nextTick()

		expect(texts()).toEqual(['Первый', 'Второй'])
		expect(transitioning(next).filter((property) => property !== 'opacity')).toEqual([])
		expect(card(next).getBoundingClientRect().bottom).toBeCloseTo(VIEWPORT.height - OFFSET, 0)
	})
})
