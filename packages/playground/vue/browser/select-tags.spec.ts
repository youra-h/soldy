/**
 * Раскладка поля Select: теги в режиме `multiple` и минимальная ширина поля в
 * обоих режимах, `single` и `multiple`, на каждом размере.
 *
 * Проверяем не разметку, а посчитанные размеры, поэтому тест браузерный:
 * в jsdom `getBoundingClientRect()` возвращает нули, и любое утверждение о
 * ширинах там проходит вхолостую.
 *
 * Стенд, а не пакет адаптера: здесь единственное место, где настоящие
 * компоненты встречаются с собранной темой. Правила, которые эти тесты
 * стерегут, — раскладка поля с тегами и его минимальная ширина — лежат в
 * `themes/oren/src/components/select/_select.scss`, а сжатие тега, которому
 * не хватает места в поле, — в `themes/oren/src/components/tags/_tags.scss`.
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

/** Режимы выбора: минимальная ширина поля у каждого своя. */
const MODES = ['single', 'multiple'] as const

/**
 * Select заданного размера и режима в контейнере заданной ширины. В обоих
 * режимах `clearable`: справа стоят и очистка, и стрелка — худший случай для
 * минимума поля.
 *
 * - `multiple` — один выбранный тег: слоту с тегом остаётся меньше всего
 *   места.
 * - `single` — без значения: очистку рисует уже `clearable`, и на крупных
 *   размерах стрелка выходила за поле и без выбора.
 */
const sizedHarness = (
	size: (typeof COMPONENT_SIZES)[number],
	mode: (typeof MODES)[number],
	width: number,
) =>
	defineComponent({
		render() {
			return h('div', { style: `width: ${width}px` }, [
				h(
					Select,
					mode === 'multiple'
						? { mode, editable: true, clearable: true, value: ['0'], size }
						: { mode, clearable: true, size },
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

/** Вычисленное значение свойства в пикселях: ширина рамки, отступ. */
const px = (element: Element, property: string) =>
	parseFloat(getComputedStyle(element).getPropertyValue(property))

/** Прямоугольник внутри рамки — место, которое элемент отдаёт своим частям. */
const insideBorder = (element: Element) => {
	const { x, y, width, height } = box(element)
	const left = px(element, 'border-left-width')
	const right = px(element, 'border-right-width')

	return new DOMRect(x + left, y, width - left - right, height)
}

/** Прямоугольник вместе с внешними отступами по горизонтали — место части в ряду. */
const withMargins = (element: Element) => {
	const { x, y, width, height } = box(element)
	const left = px(element, 'margin-left')
	const right = px(element, 'margin-right')

	return new DOMRect(x - left, y, width + left + right, height)
}

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
 * Стоит ли ввод в одной строке с первым рядом тегов.
 *
 * Порог — половина высоты тега, а не просто «перекрытие больше нуля»:
 * съехавший ввод начинается ровно там, где ряд тегов кончается, то есть
 * перекрытие у него не отрицательное, а нулевое. Строгое `> 0` баг ловит, но
 * без запаса, и субпиксельное округление могло бы это перевернуть.
 */
const expectInputInTagRow = () => {
	const tag = box(tags()[0])

	expect(verticalOverlap(box(input()), tag)).toBeGreaterThan(tag.height / 2)
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
		expectInputInTagRow()
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
		expectInputInTagRow()
	})
})

/**
 * Очистка, стрелка и пилюля тега растут с размером, а общий минимум ширины
 * `.s-select` — нет: на `2xl` стрелка выходила за правый край поля и без
 * выбора. Поэтому минимум поля растёт с размером; в `multiple` он держит ещё
 * и пилюлю тега — это проверяет блок ниже.
 *
 * Проверяется слот очистки и стрелки, а не сами части: отступ стрелки от рамки
 * — паддинг слота, своего у неё нет. Бокс стрелки лежит внутри поля и тогда,
 * когда она съела этот отступ и легла вплотную к рамке, и минимум, подобранный
 * по такой проверке, вышел бы уже нужного.
 */
describe.each(COMPONENT_SIZES)('размер %s: минимальная ширина поля', (size) => {
	it.each(MODES)('%s: очистка и стрелка помещаются в поле', async (mode) => {
		await render(sizedHarness(size, mode, NARROW_WIDTH))

		// В `multiple` значение становится тегом не сразу: опция сначала
		// регистрируется в коллекции. Минимум поля считается вместе с тегом.
		await expect.poll(() => tags().length).toBe(mode === 'multiple' ? 1 : 0)

		const field = find('.s-select__field')
		const slot = find('.s-input__trailing', field)

		// Худший случай для минимума — в слоте и очистка, и стрелка.
		expect(slot.querySelectorAll('.s-select__clear, .s-select__arrow')).toHaveLength(2)
		expectWithin(box(slot), insideBorder(field), 'очистка и стрелка с отступом')
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
		await render(sizedHarness(size, 'multiple', width))

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

	/**
	 * Тег сжимается до ширины слота, но уже пилюли с одним крестиком ему
	 * сжиматься некуда: крестик выходит за пилюлю и заезжает на ввод. Этого не
	 * даёт минимум поля. Крестик — вместе с отступом: отступ и есть концевой
	 * паддинг пилюли (`tags/_tags.scss`), и без него проверку прошёл бы
	 * крестик, прижатый к краю пилюли.
	 */
	it('на минимальной ширине поля крестик с отступом внутри пилюли', async () => {
		const { item, close } = await renderTag(NARROW_WIDTH)

		expectWithin(withMargins(close), insideBorder(item), 'крестик с отступом')
	})

	it('в широком поле текст тега не обрезан', async () => {
		const { text } = await renderTag(FIELD_WIDTH)

		expect(text.scrollWidth).toBeLessThanOrEqual(text.clientWidth)
	})
})
