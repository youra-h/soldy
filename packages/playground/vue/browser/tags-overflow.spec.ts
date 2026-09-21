/**
 * Переполнение ряда тегов в настоящем браузере.
 *
 * Здесь проверяется то, чего нет нигде больше: замер. В jsdom
 * `getBoundingClientRect()` возвращает нули, и «сколько тегов помещается» там
 * не вопрос вовсе. Ряд считает `TTagsOverflowPlugin` по ширинам узлов, делит
 * состав расширение коллекции, а раскладку ряда — одна строка, обрезанный
 * хвост — держит `themes/oren/src/components/tags/_tags.scss`.
 *
 * Сторож ошибок окна (`browser/setup.ts`) здесь работает как второй тест:
 * замер, который гоняется за собственным результатом, уронил бы прогон
 * сообщением `ResizeObserver loop completed with undelivered notifications`.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h } from 'vue'
import { Tags } from '@soldy/ui-vue'

import '@soldy/theme-oren'

/** Тегов заведомо больше, чем влезает в узкий ряд. */
const TAGS = ['Москва', 'Санкт-Петербург', 'Екатеринбург', 'Новосибирск', 'Владивосток']

/** Ширина, на которой помещаются все теги. */
const WIDE = 900

/** Ширина, на которой их помещается меньше половины. */
const NARROW = 260

/**
 * Ширина, на которой в ряду остаётся не один тег, а несколько: на одном
 * порядок ряда не проверить — кнопке не с чем стоять рядом.
 */
const SEVERAL = 560

const harness = (width: number, props: Record<string, unknown> = {}) =>
	defineComponent({
		render() {
			return h('div', { class: 's-host', style: `width: ${width}px` }, [
				h(Tags, {
					overflow: 'popover',
					closable: true,
					items: TAGS.map((text) => ({ value: text, text })),
					...props,
				}),
			])
		},
	})

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
const find = (selector: string, root: ParentNode = document): HTMLElement => {
	const element = root.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

const host = () => find('.s-host')
const row = () => find('.s-tags:not(.s-tags__panel)')
const more = () => document.querySelector('.s-tags__more')
const panel = () => document.querySelector('.s-tags__panel')

/** Тексты тегов внутри узла — по ним видно, кто в ряду, а кто в панели. */
const textsIn = (scope: ParentNode) =>
	[...scope.querySelectorAll('.s-tags-item')].map((item) => item.textContent?.trim() ?? '')

const inRow = () => textsIn(row())

/** Сколько тегов осталось в ряду: замер идёт кадрами, поэтому через poll. */
const settled = (count: number) => expect.poll(() => inRow().length).toBe(count)

beforeEach(() => {
	// Тема читается с корня документа — тот же атрибут, что в `index.html`.
	document.documentElement.dataset.theme = 'oren'
})

describe('широкий ряд: делить нечего', () => {
	beforeEach(() => {
		render(harness(WIDE))
	})

	it('все теги в ряду, кнопки «…» нет', async () => {
		await settled(TAGS.length)

		expect(inRow()).toEqual(TAGS)
		expect(more()).toBeNull()
		expect(panel()).toBeNull()
	})

	it('ряд стоит в одну строку', async () => {
		await settled(TAGS.length)

		const tops = [...row().querySelectorAll('.s-tags-item')].map(
			(item) => item.getBoundingClientRect().top,
		)

		expect(new Set(tops.map(Math.round)).size).toBe(1)
	})
})

describe('узкий ряд: хвост уезжает в панель', () => {
	beforeEach(() => {
		render(harness(NARROW))
	})

	it('в ряду остаются только поместившиеся, и они внутри его ширины', async () => {
		await expect.poll(() => more()).not.toBeNull()

		const box = row().getBoundingClientRect()
		const button = find('.s-tags__more').getBoundingClientRect()

		expect(inRow().length).toBeGreaterThan(0)
		expect(inRow().length).toBeLessThan(TAGS.length)

		for (const item of row().querySelectorAll('.s-tags-item')) {
			// Допуск на субпиксельное округление ширин
			expect(item.getBoundingClientRect().right).toBeLessThanOrEqual(box.right + 0.5)
		}

		// Кнопка «…» — последняя в ряду и тоже внутри него
		expect(button.right).toBeLessThanOrEqual(box.right + 0.5)
	})

	it('значок кнопки — иконка с ненулевым боксом', async () => {
		// Ряд не переносится и не сжимается: иконка без размера от темы
		// схлопнулась бы здесь в 0×0, как крестики Tabs и Tags на `xl`
		await expect.poll(() => more()).not.toBeNull()

		const icon = document.querySelector('.s-tags__more svg.s-icon')

		// Не `find`: у `svg` свой интерфейс, HTML-узлом он не является
		if (!(icon instanceof SVGElement)) throw new Error('значка у кнопки «…» нет')

		const box = icon.getBoundingClientRect()

		expect(box.width).toBeGreaterThan(0)
		expect(box.height).toBeGreaterThan(0)
	})

	it('в панели — ровно непоместившиеся, и каждый тег отрисован один раз', async () => {
		await expect.poll(() => more()).not.toBeNull()

		const fitted = inRow()

		await userEvent.click(find('.s-tags__more'))
		await expect.poll(() => panel()).not.toBeNull()

		expect(textsIn(find('.s-tags__panel'))).toEqual(TAGS.slice(fitted.length))
		expect(textsIn(document.body).length).toBe(TAGS.length)
	})

	it('закрыли последний тег панели — панель закрылась', async () => {
		await expect.poll(() => more()).not.toBeNull()
		await userEvent.click(find('.s-tags__more'))
		await expect.poll(() => panel()).not.toBeNull()

		// Закрываем теги панели по одному: с каждым закрытым ряду достаётся
		// больше места, и хвост тает быстрее — считать их заранее нельзя
		for (let guard = TAGS.length; guard > 0 && panel() !== null; guard--) {
			await userEvent.click(find('.s-tags__panel .s-tags-item__close'))
		}

		await expect.poll(() => panel()).toBeNull()
	})
})

describe('в ряду несколько тегов', () => {
	beforeEach(() => {
		render(harness(SEVERAL))
	})

	/**
	 * Порядок в ряду задаёт коллекция, а не разметка: тег несёт свой номер
	 * стилем (`order`), и кнопке нужен свой. Без него она вставала нулевой —
	 * то есть сразу за первым тегом, хотя в разметке стоит после всех.
	 * Здесь это и видно: в DOM порядок был верным всегда, врала раскладка.
	 */
	it('кнопка «…» стоит за всеми тегами ряда, а не между ними', async () => {
		await expect.poll(() => more()).not.toBeNull()

		const button = find('.s-tags__more').getBoundingClientRect()

		// Иначе сравнивать нечего: с одним тегом кнопка окажется второй и при
		// сломанном порядке, и проверка молча перестанет что-либо сторожить
		expect(inRow().length).toBeGreaterThan(1)

		for (const item of row().querySelectorAll('.s-tags-item')) {
			expect(item.getBoundingClientRect().right).toBeLessThanOrEqual(button.left + 0.5)
		}
	})

	/**
	 * И не вплотную за последним тегом, а у края: свободное место забирает
	 * автоотступ кнопки. Иначе её край прыгал бы с каждым закрытым тегом.
	 */
	it('кнопка «…» прижата к концу строки', async () => {
		await expect.poll(() => more()).not.toBeNull()

		const box = row().getBoundingClientRect()
		const button = find('.s-tags__more').getBoundingClientRect()
		const last = [...row().querySelectorAll('.s-tags-item')].pop()

		if (!last) throw new Error('в ряду не осталось тегов')

		// Место между последним тегом и кнопкой есть — значит, она не «едет» за
		// тегами, а стоит у края
		expect(button.left - last.getBoundingClientRect().right).toBeGreaterThan(1)
		expect(box.right - button.right).toBeLessThan(2)
	})
})

describe('ряд справа налево', () => {
	/**
	 * Отступ логический, поэтому в RTL концом строки становится левый край:
	 * теги идут справа, кнопка уезжает влево — за ними, а не перед ними.
	 * Направление ряду задаёт проп `direction`, он пишет корню `dir`.
	 */
	it('в RTL кнопка уезжает к левому краю, а теги остаются справа', async () => {
		render(harness(SEVERAL, { direction: 'rtl' }))

		await expect.poll(() => more()).not.toBeNull()

		// Направление дошло до корня — иначе проверка ниже сторожит LTR
		expect(row().getAttribute('dir')).toBe('rtl')

		const box = row().getBoundingClientRect()
		const button = find('.s-tags__more').getBoundingClientRect()

		expect(button.left - box.left).toBeLessThan(2)

		for (const item of row().querySelectorAll('.s-tags-item')) {
			expect(item.getBoundingClientRect().left).toBeGreaterThanOrEqual(button.right - 0.5)
		}
	})
})

describe('ряд меняет ширину', () => {
	it('сужение и возврат сходятся: теги возвращаются, кнопка пропадает', async () => {
		render(harness(WIDE))

		await settled(TAGS.length)

		host().style.width = `${NARROW}px`

		await expect.poll(() => more()).not.toBeNull()
		expect(inRow().length).toBeLessThan(TAGS.length)

		host().style.width = `${WIDE}px`

		await settled(TAGS.length)
		await expect.poll(() => more()).toBeNull()
	})
})
