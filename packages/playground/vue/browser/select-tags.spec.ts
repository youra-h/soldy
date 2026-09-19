/**
 * Раскладка поля Select в режиме `multiple`.
 *
 * Проверяем не разметку, а посчитанные размеры, поэтому тест браузерный:
 * в jsdom `getBoundingClientRect()` возвращает нули, и любое утверждение о
 * ширинах там проходит вхолостую.
 *
 * Стенд, а не пакет адаптера: здесь единственное место, где настоящие
 * компоненты встречаются с собранной темой. Правила, которые эти тесты
 * стерегут, лежат в `themes/oren/src/components/select/_select.scss`, а
 * сжатие тега, которому не хватает места в поле, — в
 * `themes/oren/src/components/tags/_tags.scss`. Геометрия строки поля —
 * высота размера и строка слота, в которую встают теги, очистка и стрелка, —
 * в `themes/oren/src/components/input/_input.scss`.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h } from 'vue'
import { COMPONENT_SIZES } from '@soldy/playground-shared'
import { Select, SelectItem } from '@soldy/ui-vue'

import '@soldy/theme-oren'

/** Нижняя граница ширины ввода — `min-w-16` из `_input.scss`, в пикселях. */
const MIN_INPUT_WIDTH = 64

/**
 * Ширина поля фиксирована: `.s-select` — `w-full`, и без явной рамки замеры
 * зависели бы от размера окна, в котором запущен прогон.
 */
const FIELD_WIDTH = 420

/**
 * Опций заведомо больше, чем влезает тегами в одну строку: последний тест
 * выбирает их все и проверяет, что ввод упёрся в минимум, а не схлопнулся.
 */
const OPTIONS = ['Москва', 'Тверь', 'Тула', 'Казань', 'Самара', 'Омск', 'Пермь', 'Сочи']

const Harness = {
	render: () =>
		h('div', { style: `width: ${FIELD_WIDTH}px` }, [
			h(
				Select,
				{ mode: 'multiple', editable: true, name: 'Город' },
				{
					default: () =>
						OPTIONS.map((text, index) =>
							h(SelectItem, { key: text, value: String(index), text }),
						),
				},
			),
		]),
}

/**
 * Контейнер уже любого минимума поля: `.s-select` — `w-full`, и поле встаёт
 * на свой `min-width`, каким бы он ни был.
 */
const NARROW_WIDTH = 0

/**
 * Select с одним выбранным тегом в контейнере заданной ширины. `clearable` —
 * справа стоят и очистка, и стрелка, и слоту с тегом остаётся меньше всего
 * места.
 */
const tagHarness = (size: (typeof COMPONENT_SIZES)[number], width: number) =>
	defineComponent({
		render() {
			return h('div', { style: `width: ${width}px` }, [
				h(
					Select,
					{ mode: 'multiple', editable: true, clearable: true, value: ['0'], size },
					{ default: () => [h(SelectItem, { key: '0', value: '0', text: 'Москва' })] },
				),
			])
		},
	})

const input = () => document.querySelector('.s-select__field input') as HTMLInputElement
const arrow = () => document.querySelector('.s-select__arrow') as HTMLElement
const tags = () => [...document.querySelectorAll('.s-tags-item')]
const options = () => [...document.querySelectorAll('[role="option"]')] as HTMLElement[]

/** Узел по селектору внутри корня; нет его — тест падает здесь, а не на чтении свойства. */
const find = (selector: string, root: ParentNode = document): HTMLElement => {
	const element = root.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

const box = (element: Element) => element.getBoundingClientRect()

/** Лежит ли прямоугольник по горизонтали внутри другого. */
const expectWithin = (inner: DOMRect, outer: DOMRect, what: string) => {
	expect(inner.left, `${what}: левый край`).toBeGreaterThanOrEqual(outer.left)
	expect(inner.right, `${what}: правый край`).toBeLessThanOrEqual(outer.right)
}

/**
 * Насколько два прямоугольника перекрываются по вертикали; ноль и меньше —
 * они в разных строках.
 */
const verticalOverlap = (a: DOMRect, b: DOMRect) =>
	Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)

/**
 * Стоит ли часть поля — ввод, стрелка — в одной строке с первым рядом тегов.
 *
 * Порог — половина высоты тега, а не просто «перекрытие больше нуля»:
 * съехавший ввод начинается ровно там, где ряд тегов кончается, то есть
 * перекрытие у него не отрицательное, а нулевое. Строгое `> 0` баг ловит, но
 * без запаса, и субпиксельное округление могло бы это перевернуть.
 */
const expectInFirstTagRow = (element: Element, what: string) => {
	const tag = box(tags()[0])

	expect(verticalOverlap(box(element), tag), what).toBeGreaterThan(tag.height / 2)
}

/**
 * В `editable` клик по тексту поля не открывает панель — только клик по
 * стрелке (`TSelectPointerPlugin`), и он же тумблер, поэтому кликать перед
 * каждым выбором нельзя: второй клик закроет панель. Открыта она или нет,
 * спрашиваем у самого поля — оно объявляет это через `aria-expanded`.
 */
const ensureOpen = async () => {
	if (input().getAttribute('aria-expanded') !== 'true') await userEvent.click(arrow())
}

/** Добавляет `count` тегов к уже выбранным — выбором опций, как это делает человек. */
const addTags = async (count: number) => {
	const already = tags().length

	for (let index = already; index < already + count; index++) {
		await ensureOpen()
		await userEvent.click(options()[index])
	}

	await expect.poll(() => tags().length).toBe(already + count)
}

beforeEach(() => {
	// Тема читается с корня документа — тот же атрибут, что в `index.html`.
	document.documentElement.dataset.theme = 'oren'
})

describe('поле с тегами', () => {
	beforeEach(() => {
		render(Harness)
	})

	/**
	 * Тот самый баг: `flex-wrap` на поле вместе с `w-full` у `<input>` уводил
	 * ввод целиком на вторую строку, вместо того чтобы дать ему сжаться.
	 */
	it('ввод остаётся в строке тегов, а не уезжает под них', async () => {
		await addTags(3)

		// Поле выравнивает содержимое по верху (`items-start`), поэтому ввод
		// стоит рядом с ПЕРВЫМ рядом тегов — независимо от того, перенеслись ли
		// остальные. Съехавший ввод оказался бы целиком ниже этого ряда.
		expectInFirstTagRow(input(), 'ввод')
	})

	/**
	 * Пока высота поля с тегами была постоянной, перенесённые теги рисовались
	 * под полем, поверх того, что ниже. Поле растёт по строкам тегов, а стрелка,
	 * как и ввод, остаётся на первой строке, а не встаёт посередине выросшего
	 * поля.
	 */
	it('поле растёт по строкам тегов, стрелка — на первой строке', async () => {
		await addTags(OPTIONS.length)

		const all = tags().map(box)
		const first = all[0]
		const last = all[all.length - 1]
		const field = box(find('.s-select__field'))

		// Без переноса проверять нечего: строк должно быть несколько
		expect(last.top, 'последний тег — ниже первой строки').toBeGreaterThan(first.bottom)

		expect(last.top, 'последний тег: верх').toBeGreaterThanOrEqual(field.top)
		expect(last.bottom, 'последний тег: низ').toBeLessThanOrEqual(field.bottom)

		all.forEach((tag, index) => {
			expect(tag.height, `тег ${index}: высота`).toBeCloseTo(first.height, 1)
		})

		expectInFirstTagRow(arrow(), 'стрелка')
	})

	it('ввод сжимается по мере роста числа тегов', async () => {
		await addTags(1)
		const wide = box(input()).width

		await addTags(2)
		const narrow = box(input()).width

		expect(narrow).toBeLessThan(wide)
	})

	/**
	 * Требование из задачи: сжиматься — да, но не до полосы, в которую нельзя
	 * печатать. Нижнюю границу держит `min-w-16`, и она же не даёт тегам
	 * отобрать всю строку.
	 */
	it('ввод не сжимается ниже min-width', async () => {
		await addTags(OPTIONS.length)

		// Допуск на субпиксельное округление — граница задана ровно в 4rem.
		expect(box(input()).width).toBeGreaterThanOrEqual(MIN_INPUT_WIDTH - 0.5)
		expectInFirstTagRow(input(), 'ввод')
	})
})

/**
 * Слоту с тегами снят минимум ширины, чтобы вводу доставался остаток строки,
 * и в узком поле слот сжимается уже тега. Один тег переносить некуда, и пока
 * он не сжимался сам, он переполнял слот, а центровка слота делила
 * переполнение на обе стороны: левая часть уходила за рамку поля.
 */
describe.each(COMPONENT_SIZES)('размер %s: тег, которому не хватает места в поле', (size) => {
	/**
	 * Рисует Select в контейнере заданной ширины и, когда значение стало
	 * тегом, отдаёт поле и части тега.
	 */
	const renderTag = async (width: number) => {
		render(tagHarness(size, width))

		await expect.poll(() => tags().length).toBe(1)

		const item = find('.s-tags-item')

		return {
			field: find('.s-select__field'),
			item,
			text: find(':scope > .s-button:not(.s-tags-item__close) .s-button__text', item),
			close: find(':scope > .s-tags-item__close', item),
		}
	}

	it('на минимальной ширине поля тег и крестик внутри поля, текст обрезан', async () => {
		const { field, item, text, close } = await renderTag(NARROW_WIDTH)

		expectWithin(box(item), box(field), 'тег')
		expectWithin(box(close), box(field), 'крестик')
		expect(text.scrollWidth).toBeGreaterThan(text.clientWidth)
	})

	it('в широком поле текст тега не обрезан', async () => {
		const { text } = await renderTag(FIELD_WIDTH)

		expect(text.scrollWidth).toBeLessThanOrEqual(text.clientWidth)
	})
})

/**
 * Поле с тегами растёт по строкам, но одна строка тегов — ровно высота
 * размера, как у поля без тегов, и корень Select — ровно по полю. Лишние
 * пиксели вернуть легко: ввод с размерным `leading-*` раздувает строку на
 * рамку и оба просвета, паддинг поля шире просвета слота (прежний `py-1`) — на
 * разницу между ними.
 */
describe.each(COMPONENT_SIZES)('размер %s: высота поля с одним тегом', (size) => {
	/**
	 * Два Select одного размера и режима, по контейнеру на каждый: с одним
	 * тегом и без выбора. Разница между ними — только тег.
	 */
	const pairHarness = defineComponent({
		render() {
			const select = (value?: string[]) =>
				h('div', { style: `width: ${FIELD_WIDTH}px` }, [
					h(
						Select,
						{ mode: 'multiple', editable: true, clearable: true, value, size },
						{
							default: () => [
								h(SelectItem, { key: '0', value: '0', text: 'Москва' }),
							],
						},
					),
				])

			return h('div', [select(['0']), select()])
		},
	})

	it('та же, что у поля без выбора, а корень — ровно по полю', async () => {
		render(pairHarness)

		await expect.poll(() => tags().length).toBe(1)

		const roots = [...document.querySelectorAll('.s-select')]

		expect(roots).toHaveLength(2)

		const [tagged, empty] = roots.map((root) => ({
			root: box(root),
			field: box(find('.s-select__field', root)),
		}))

		expect(tagged.field.height, 'поле с тегом').toBeCloseTo(empty.field.height, 1)
		expect(tagged.root.height, 'корень с тегом').toBeCloseTo(tagged.field.height, 1)
		expect(empty.root.height, 'корень без выбора').toBeCloseTo(empty.field.height, 1)
	})
})
