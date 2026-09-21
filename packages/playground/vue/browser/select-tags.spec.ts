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
 * Геометрия строки поля — высота размера и строка слота, в которую встают
 * теги, очистка и стрелка, — в `themes/oren/src/components/input/_input.scss`.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h } from 'vue'
import { COMPONENT_SIZES } from '@soldy/playground-shared'
import { Select, SelectItem } from '@soldy/ui-vue'
import type { TTagsOverflow } from '@soldy/core'

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

/** Значения всех опций сразу — выбор, который в одну строку не помещается. */
const ALL_VALUES = OPTIONS.map((_, index) => String(index))

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

/**
 * Пара Select одного размера и режима, по контейнеру на каждый: с выбором и
 * без него. Разница между ними — только теги, поэтому высоты полей сравнимы
 * напрямую.
 */
const pairHarness = (options: {
	/** Значения выбранного Select — по одному на каждую опцию из `texts`. */
	value: string[]
	texts: readonly string[]
	size?: (typeof COMPONENT_SIZES)[number]
	overflow?: TTagsOverflow
}) =>
	defineComponent({
		render() {
			const select = (value?: string[]) =>
				h('div', { style: `width: ${FIELD_WIDTH}px` }, [
					h(
						Select,
						{
							mode: 'multiple',
							editable: true,
							clearable: true,
							size: options.size,
							tags_overflow: options.overflow,
							value,
						},
						{
							default: () =>
								options.texts.map((text, index) =>
									h(SelectItem, { key: text, value: String(index), text }),
								),
						},
					),
				])

			return h('div', [select(options.value), select()])
		},
	})

const input = () => document.querySelector('.s-select__field input') as HTMLInputElement
const arrow = () => document.querySelector('.s-select__arrow') as HTMLElement
const tags = () => [...document.querySelectorAll('.s-tags-item')]
const options = () => [...document.querySelectorAll('[role="option"]')] as HTMLElement[]

/**
 * Теги, оставшиеся в самом поле: в `popover` хвост ряда уезжает в панель, а
 * она телепортирована в `body` и в поле уже не лежит.
 */
const fieldTags = (root: ParentNode = document) => [
	...root.querySelectorAll('.s-select__field .s-tags-item'),
]

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

	/**
	 * Поле под теги больше не расширяется: лестница минимумов под пилюлю с
	 * крестиком снята — правило, которое зависит от того, сколько тегов и
	 * какие они, неверно по построению. Вместо неё слот берёт остаток строки
	 * и обрезает лишнее, поэтому проверяется слот: он и есть граница, за
	 * которую ничего не нарисуется.
	 */
	it('на минимальной ширине поля ряд обрезает слот, а не выносит за поле', async () => {
		const { field, text } = await renderTag(NARROW_WIDTH)

		expectWithin(box(find('.s-input__leading', field)), insideBorder(field), 'слот тегов')
		expect(text.scrollWidth).toBeGreaterThan(text.clientWidth)
	})

	/**
	 * То, ради чего лестница и снята: поле под теги не расширяется. Минимум
	 * его ширины одинаков с тегами и без них — правило, которое зависит от
	 * того, сколько тегов и какие они, неверно по построению.
	 */
	it('минимум поля не зависит от того, есть ли в нём теги', async () => {
		await render(sizedHarness(size, 'single', NARROW_WIDTH))

		const single = box(find('.s-select')).width

		cleanup()
		await render(sizedHarness(size, 'multiple', NARROW_WIDTH))
		await expect.poll(() => tags().length).toBe(1)

		expect(box(find('.s-select')).width).toBeCloseTo(single, 1)
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
	it('та же, что у поля без выбора, а корень — ровно по полю', async () => {
		render(pairHarness({ value: ['0'], texts: ['Москва'], size }))

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

/**
 * Режимы, в которых ряд не переносится, и признак того, что раскладка улеглась.
 *
 * - `scroll` — все теги остаются в ряду, уезжать им некуда.
 * - `popover` — хвост уезжает в панель, и это занимает кадры замера: ждём
 *   кнопку «…».
 */
const SINGLE_ROW_MODES = [
	{
		overflow: 'scroll',
		settled: () => fieldTags().length === OPTIONS.length,
	},
	{
		overflow: 'popover',
		settled: () => document.querySelector('.s-tags__more') !== null,
	},
] as const

/**
 * Рост поля привязан к `wrap` — умолчанию, в котором ряд переносится по
 * строкам. В `scroll` и `popover` переносить нечего: ряд стоит одной строкой
 * (`tags/_tags.scss`), и поле обязано остаться высоты размера. Иначе выходит,
 * что его растит сам факт тегов, а не перенос.
 *
 * Это сторож условия `data-overflow='wrap'` в правиле роста
 * (`select/_select.scss`): без него в `popover` слот вытягивается по кнопке
 * «…» и тянет за собой поле.
 *
 * Сколько тегов осталось в ряду, а сколько уехало в панель, проверяет
 * `tags-overflow.spec.ts` — здесь важны строка и высота.
 */
describe.each(SINGLE_ROW_MODES)('tags_overflow: $overflow', ({ overflow, settled }) => {
	it('ряд — одна строка, а поле не выше поля без выбора', async () => {
		render(pairHarness({ value: ALL_VALUES, texts: OPTIONS, overflow }))

		await expect.poll(settled).toBe(true)

		const roots = [...document.querySelectorAll('.s-select')]

		expect(roots).toHaveLength(2)

		const [tagged, empty] = roots
		const field = box(find('.s-select__field', tagged))

		// Части ряда в поле: теги и, в `popover`, кнопка «…». Своя высота у
		// кнопки — размерная высота Button, то есть высота всего поля, и без
		// строки поля она вылезала за рамку.
		const parts = [...fieldTags(tagged), ...tagged.querySelectorAll('.s-tags__more')].map(box)

		expect(parts.length, 'частей ряда в поле').toBeGreaterThan(0)
		expect(new Set(parts.map((part) => Math.round(part.top))).size, 'строк в ряду').toBe(1)

		parts.forEach((part, index) => {
			expect(part.height, `часть ряда ${index}: высота`).toBeCloseTo(parts[0].height, 1)
			expect(part.bottom, `часть ряда ${index}: низ`).toBeLessThanOrEqual(field.bottom)
		})

		expect(field.height, 'поле с тегами').toBeCloseTo(
			box(find('.s-select__field', empty)).height,
			1,
		)
	})

	/**
	 * Долю строки слот берёт под теги, а не под сам факт режима: в `multiple`
	 * контейнер тегов стоит в разметке всегда, и по нему одному доля
	 * включалась заранее — поле без выбора отдавало полстроки пустому слоту, а
	 * ввод ужимался вдвое.
	 */
	it('без выбора слот тегов места не занимает', async () => {
		render(pairHarness({ value: ALL_VALUES, texts: OPTIONS, overflow }))

		await expect.poll(settled).toBe(true)

		const [tagged, empty] = [...document.querySelectorAll('.s-select')]
		const taggedSlot = box(find('.s-input__leading', tagged)).width
		const emptySlot = box(find('.s-input__leading', empty)).width

		// С тегами слот — доля строки; без тегов он не должен быть даже её
		// четвертью, иначе доля включилась по пустому ряду
		expect(emptySlot, 'пустой слот').toBeLessThan(taggedSlot / 4)
	})
})

/**
 * Кнопка «…» в поле стоит вплотную за тегами, а не в конце ряда.
 *
 * В самостоятельном наборе её прижимает к краю автоотступ (`tags/_tags.scss`):
 * ряд там занимает контейнер целиком, и конец ряда — это конец строки. В поле
 * ширина ряда — доля строки, а не его содержимое (`flex-1`), и тот же отступ
 * оставлял бы дыру между последним тегом и кнопкой, за которой сразу шёл бы
 * ввод. Отступ снят контекстом в `select/_select.scss`.
 */
describe('кнопка «…» в поле', () => {
	it('стоит сразу за последним тегом, а не у края ряда', async () => {
		render(pairHarness({ value: ALL_VALUES, texts: OPTIONS, overflow: 'popover' }))

		await expect.poll(() => document.querySelector('.s-tags__more')).not.toBeNull()

		const tagged = find('.s-select')
		const parts = fieldTags(tagged)
		const last = parts[parts.length - 1]

		expect(parts.length, 'тегов в поле').toBeGreaterThan(0)

		const gap = box(find('.s-tags__more', tagged)).left - box(last).right

		// Ровно зазор ряда, а не остаток строки: допуск на субпиксели
		expect(gap, 'зазор между тегом и кнопкой').toBeLessThan(12)
	})
})
