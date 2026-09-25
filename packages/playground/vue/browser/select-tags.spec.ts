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
 * стерегут, — раскладка поля с тегами, его минимальная ширина и обрезка слота
 * с тегами — лежат в `themes/oren/src/components/select/_select.scss`, а
 * сжатие тега, которому не хватает места в поле, его натуральная ширина в
 * однострочном ряду, ряд `scroll` без полосы прокрутки, с подсказкой у края и
 * запасом под кольцо фокуса и обрезка ряда `popover` с запасом под кольцо — в
 * `themes/oren/src/components/tags/_tags.scss`.
 * Геометрия строки поля — высота размера и строка слота, в которую встают
 * теги, очистка и стрелка, — в `themes/oren/src/components/input/_input.scss`.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h } from 'vue'
import { COMPONENT_SIZES } from '@soldy-ui/playground-shared'
import { Select, SelectItem } from '@soldy-ui/vue'
import type { TDirection, TTagsOverflow } from '@soldy-ui/core'

import { expectRingInsideHorizontally, expectRingInsideVertically } from './focus-ring'
import { expectInsideWindow } from './viewport'

import '@soldy-ui/theme-oren'

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

/**
 * Опций столько, что хвост не помещается и в панель: она упирается в свой
 * потолок высоты и обязана прокручивать содержимое, а не расти за край окна.
 *
 * Последняя — заведомо шире панели: на ней и видно, что тег в панели не
 * сжимается. Стоит она в конце, чтобы в поле помещались первые, обычные: ряд,
 * в который не влез ни один тег, — случай не этого спека.
 */
const MANY_OPTIONS = [
	...Array.from({ length: 23 }, (_, index) => `Екатеринбург-${index + 1}`),
	'Петропавловск-Камчатский, улица Ленинградская, 24',
]

const MANY_VALUES = MANY_OPTIONS.map((_, index) => String(index))

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
	direction?: TDirection
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
							direction: options.direction,
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

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/**
 * Открывает панель хвоста за кнопкой «…» и отдаёт её узлы, когда раскладка
 * улеглась.
 *
 * Координаты панели пишет `TAnchorPlugin`, и первый расчёт идёт по ещё
 * нулевому размеру скрытой панели: сторону он объявляет сразу
 * (`data-placement`), а поправку по настоящему размеру приносит
 * `ResizeObserver` кадром позже — отсюда два кадра ожидания.
 */
const openTailPanel = async () => {
	await expect.poll(() => document.querySelector('.s-tags__more')).not.toBeNull()
	await userEvent.click(find('.s-tags__more'))
	await expect.poll(() => document.querySelector('.s-tags__panel')).not.toBeNull()

	const frame = find('.s-popover__panel')

	await expect.poll(() => frame.dataset.placement).toBeDefined()
	await nextFrame()
	await nextFrame()

	return { frame, content: find('.s-popover__content'), tail: find('.s-tags__panel') }
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

/** Есть ли узлу что прокручивать по строке: содержимое шире его самого. */
const scrolls = (element: Element) => element.scrollWidth > element.clientWidth

/**
 * Режимы, в которых ряд не переносится, и признак того, что раскладка улеглась.
 *
 * - `scroll` — все теги остаются в ряду, уезжать им некуда.
 * - `arrows` — тоже все, только внутри вьюпорта ленты: ждём, пока она поймёт,
 *   что листать есть куда.
 * - `popover` — хвост уезжает в панель, и это занимает кадры замера: ждём
 *   кнопку «…».
 *
 * `crowded` — ряду поля тесно, всем тегам натуральной ширины места в нём нет:
 * ряд прокручивается, лента листается, хвост уехал в панель. Без этого
 * проверка натуральной ширины пуста — тег, которому места хватает, не
 * сжимается и при сломанном правиле. У `arrows` и `popover` теснота видна уже
 * в признаке раскладки, у `scroll` — нет: все теги в ряду и в широком поле.
 */
const SINGLE_ROW_MODES = [
	{
		overflow: 'scroll',
		settled: () => fieldTags().length === OPTIONS.length,
		crowded: (root: ParentNode) => scrolls(find('.s-select__field .s-tags', root)),
	},
	{
		overflow: 'arrows',
		settled: () =>
			document
				.querySelector('.s-select__field .s-scroller')
				?.getAttribute('data-can-next') === 'true',
		crowded: (root: ParentNode) =>
			scrolls(find('.s-select__field .s-scroller__viewport', root)),
	},
	{
		overflow: 'popover',
		settled: () => document.querySelector('.s-tags__more') !== null,
		crowded: (root: ParentNode) =>
			root.querySelector('.s-select__field .s-tags__more') !== null,
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
describe.each(SINGLE_ROW_MODES)('tags_overflow: $overflow', ({ overflow, settled, crowded }) => {
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
	 * Полоса прокрутки ряда — тоже его часть. Классическая полоса (Windows,
	 * Linux) занимает место под тегами, и Chromium прогона рисует такую же
	 * (`vitest.browser.config.ts` снимает `--hide-scrollbars`). Поле здесь
	 * постоянной высоты, и ряд `scroll` с полосой вытягивался на 11px ниже его
	 * нижней рамки. Теги при этом стояли на месте, поэтому проверка частей
	 * ряда выше этого не видит.
	 *
	 * Предусловие — теснота: полоса появляется, только когда ряд
	 * прокручивается.
	 */
	it('ряд не заходит за нижнюю рамку поля', async () => {
		render(pairHarness({ value: ALL_VALUES, texts: OPTIONS, overflow }))

		await expect.poll(settled).toBe(true)

		const [tagged] = [...document.querySelectorAll('.s-select')]
		const field = find('.s-select__field', tagged)
		const row = box(find('.s-select__field .s-tags', tagged))

		expect(crowded(tagged), 'ряду тесно').toBe(true)
		expect(row.bottom, 'низ ряда').toBeLessThanOrEqual(
			box(field).bottom - px(field, 'border-bottom-width'),
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

	/**
	 * Доля — это именно доля. Без неё база слота равна ширине всего ряда, и
	 * при шринке флексбокса всё сжатие достаётся слоту, а ввод садится на свой
	 * минимум (`min-w-16` из `_input.scss`) при любом числе тегов.
	 *
	 * Сторож правила `flex-1` в `select/_select.scss` — того, чей список
	 * режимов легко забыть пополнить: каждый новый однострочный режим обязан в
	 * него попасть.
	 */
	it('ряд берёт долю строки, а не всю её', async () => {
		render(pairHarness({ value: ALL_VALUES, texts: OPTIONS, overflow }))

		await expect.poll(settled).toBe(true)

		const [tagged] = [...document.querySelectorAll('.s-select')]
		const slot = box(find('.s-input__leading', tagged)).width

		expect(slot, 'слот тегов').toBeLessThan(FIELD_WIDTH * 0.6)
	})

	/**
	 * Не поместившееся в однострочном ряду прокручивается, листается или
	 * уезжает в панель, а не сжимается. В поле это держит правило режима
	 * (`tags/_tags.scss`): автоматический минимум ширины тегу там снят ради
	 * `wrap`, где одному тегу переносить некуда, и без `shrink-0` в `scroll`
	 * флексбокс ужимал пилюлю до крестика — листать становилось нечего.
	 *
	 * У `arrows` и `popover` правило уже было — у детей вьюпорта ленты и у
	 * тегов ряда с кнопкой «…», и тест их сторожит. Новый однострочный режим
	 * попадёт под него сам.
	 */
	it('тег в ряду натуральной ширины', async () => {
		render(pairHarness({ value: ALL_VALUES, texts: OPTIONS, overflow }))

		await expect.poll(settled).toBe(true)

		const [tagged] = [...document.querySelectorAll('.s-select')]

		expect(crowded(tagged), 'ряду тесно').toBe(true)

		const texts = fieldTags(tagged).map((item) =>
			find(':scope > .s-button:not(.s-tags-item__close) .s-button__text', item),
		)

		expect(texts.length, 'тегов в поле').toBeGreaterThan(0)

		texts.forEach((text, index) => {
			expect(text.scrollWidth, `тег ${index}: текст обрезан`).toBeLessThanOrEqual(
				text.clientWidth,
			)
		})
	})
})

/**
 * Маска подсказки у края ряда, как её отдаёт браузер: градиент по строке в
 * четыре ступени (`tags/_tags.scss`) — прозрачное у края, непрозрачное со
 * второй ступени по третью и снова прозрачное у другого края.
 */
const FADE_MASK = new RegExp(
	[
		String.raw`^linear-gradient\(to (?<to>left|right)`,
		String.raw`rgba\(0, 0, 0, 0\) 0px`,
		String.raw`rgb\(0, 0, 0\) (?<from>[\d.]+)px`,
		String.raw`rgb\(0, 0, 0\) (?:100%|calc\(100% - (?<until>[\d.]+)px\))`,
		String.raw`rgba\(0, 0, 0, 0\) 100%\)$`,
	].join(', '),
)

/**
 * Сколько гаснет у левого и у правого края узла — по вычисленной маске, то
 * есть то, что видно, а не переменные темы.
 *
 * У края, от которого идёт градиент, гаснет до второй ступени, у другого —
 * сколько третьей не хватает до 100%. Направление градиента переводит их в
 * левый и правый край: в RTL маска развёрнута.
 */
const fades = (element: Element) => {
	const mask = getComputedStyle(element).maskImage
	const stops = FADE_MASK.exec(mask)?.groups

	if (!stops) throw new Error(`маска подсказки не разобрана: ${mask}`)

	const from = Number(stops.from)
	const until = stops.until ? Number(stops.until) : 0

	return stops.to === 'right' ? { left: from, right: until } : { left: until, right: from }
}

/**
 * Ряд `scroll` в поле — без полосы прокрутки: её место под тегами поле
 * постоянной высоты не отдаёт. Листают ряд пальцем, трекпадом и колесом с
 * Shift, а где ещё есть теги, подсказывает маска у края (`tags/_tags.scss`).
 *
 * Состояния «есть что листать» у ряда нет: ширину подсказки ведёт сама
 * прокрутка ряда, поэтому проверяется вычисленная маска. Меняется она кадром
 * позже прокрутки — отсюда ожидание, а не чтение сразу.
 */
describe('tags_overflow: scroll — подсказка у края вместо полосы', () => {
	/** Ряд первого поля — того, где выбор есть. */
	const row = () => find('.s-select__field .s-tags')

	/** Поле со всеми тегами; ряду в нём тесно, и он прокручивается. */
	const renderCrowded = async (direction?: TDirection) => {
		render(pairHarness({ value: ALL_VALUES, texts: OPTIONS, overflow: 'scroll', direction }))

		await expect.poll(() => fieldTags().length).toBe(OPTIONS.length)
		await expect.poll(() => scrolls(row())).toBe(true)
	}

	it('в начале ряда гаснет только конец', async () => {
		await renderCrowded()

		await expect.poll(() => fades(row()).right).toBeGreaterThan(0)
		expect(fades(row()).left, 'начало').toBe(0)
	})

	it('в конце ряда гаснет только начало', async () => {
		await renderCrowded()

		row().scrollLeft = row().scrollWidth

		await expect.poll(() => fades(row()).left).toBeGreaterThan(0)
		// Допуск — субпиксельный остаток прокрутки
		expect(fades(row()).right, 'конец').toBeLessThan(1)
	})

	/**
	 * Подсказка у края растёт, пока ряд уходит от него на её ширину: гаснет
	 * то, что спрятано за краем, но не шире самой подсказки.
	 */
	it('у края гаснет не больше, чем за ним спрятано', async () => {
		await renderCrowded()

		await expect.poll(() => fades(row()).right).toBeGreaterThan(0)

		const full = fades(row()).right
		const shift = 4

		expect(full, 'подсказка шире сдвига').toBeGreaterThan(shift)

		row().scrollLeft = shift

		await expect.poll(() => fades(row()).left).toBeCloseTo(shift, 0)
		expect(fades(row()).right, 'конец').toBe(full)
	})

	it('ряд, который помещается, не гаснет', async () => {
		render(pairHarness({ value: ['0'], texts: OPTIONS, overflow: 'scroll' }))

		await expect.poll(() => fieldTags().length).toBe(1)

		expect(scrolls(row()), 'ряду тесно').toBe(false)

		// Ширину маске прокрутка отдаёт кадром позже: без ожидания проверка
		// прошла бы раньше, чем подсказка успела бы появиться
		await nextFrame()
		await nextFrame()

		expect(fades(row())).toEqual({ left: 0, right: 0 })
	})

	/** Начало строки в RTL — правый край: в начале ряда гаснет левый. */
	it('в RTL в начале ряда гаснет левый край', async () => {
		await renderCrowded('rtl')

		await expect.poll(() => fades(row()).left).toBeGreaterThan(0)
		expect(fades(row()).right, 'правый край').toBe(0)
	})

	/**
	 * Крестик за краем ряда браузер при фокусе докручивает, а видимый
	 * наполовину оставляет у края — под подсказкой, где его почти не видно.
	 * Отступ прокрутки ряда шириной в подсказку это исправляет: такой крестик
	 * для браузера уже не виден, и он его докручивает. Крестики — остановки
	 * Tab тегов в поле, и проверяется каждый.
	 */
	it('крестик под фокусом не остаётся под подсказкой', async () => {
		await renderCrowded()

		const closes = [...row().querySelectorAll('.s-tags-item__close')]

		expect(closes, 'крестиков в ряду').toHaveLength(OPTIONS.length)

		for (const [index, close] of closes.entries()) {
			if (!(close instanceof HTMLElement)) throw new Error(`крестик ${index}: HTML-узла нет`)

			close.focus()

			// Прокрутка отдаёт маске ширину кадром позже
			await nextFrame()
			await nextFrame()

			const bounds = box(row())
			const fade = fades(row())
			const button = box(close)

			// Допуск на субпиксели
			expect(button.left, `крестик ${index}: левый край`).toBeGreaterThanOrEqual(
				bounds.left + fade.left - 0.5,
			)
			expect(button.right, `крестик ${index}: правый край`).toBeLessThanOrEqual(
				bounds.right - fade.right + 0.5,
			)
		}
	})
})

/**
 * Кольцо фокуса крестика в ряду `scroll`.
 *
 * Прокрутка по строке делает ряд прокручиваемой областью и по вертикали, а
 * такая область режет всё, что вышло за её паддинг-бокс. Ряд стоял ровно по
 * строке слота, крестик отступает от её края на 2px, а кольцо выходит за
 * крестик на 4px: от кольца оставались одни боковые дуги. Запас под кольцо —
 * паддинг ряда (`tags/_tags.scss`). Высоты поля он не меняет, и за рамку ряд
 * не выводит — это сторожат тесты режима выше.
 */
describe('tags_overflow: scroll — кольцо фокуса крестика', () => {
	it('ряд не срезает кольцо сверху и снизу', async () => {
		render(pairHarness({ value: ALL_VALUES, texts: OPTIONS, overflow: 'scroll' }))

		await expect.poll(() => fieldTags().length).toBe(OPTIONS.length)

		const close = find('.s-select__field .s-tags-item__close')

		// С клавиатуры: кольцо рисует `:focus-visible`. У строк тегов в поле
		// остановки Tab нет, и первая остановка — крестик первого тега
		await userEvent.keyboard('{Tab}')

		expect(document.activeElement, 'фокус на крестике').toBe(close)

		expectRingInsideVertically(close, find('.s-select__field .s-tags'), 'крестик')
	})
})

/**
 * Кнопка «…» в поле стоит в конце ряда, вплотную к вводу, а не сразу за
 * последним тегом.
 *
 * Ряд в поле — доля строки (`flex-1` в `select/_select.scss`), и его конец —
 * это место, где начинается ввод. Туда кнопку уводит тот же автоотступ, что
 * в самостоятельном наборе (`tags/_tags.scss`): свободное место доли остаётся
 * между тегами и кнопкой. Пока отступ в поле снимали, кнопка шла сразу за
 * тегом, и дыра зияла уже между ней и вводом.
 */
describe('кнопка «…» в поле', () => {
	it('стоит в конце ряда, у ввода, а не сразу за последним тегом', async () => {
		render(pairHarness({ value: ALL_VALUES, texts: OPTIONS, overflow: 'popover' }))

		await expect.poll(() => document.querySelector('.s-tags__more')).not.toBeNull()

		const tagged = find('.s-select')
		const parts = fieldTags(tagged)
		const last = parts[parts.length - 1]
		const row = box(find('.s-select__field .s-tags', tagged))
		const more = box(find('.s-tags__more', tagged))

		expect(parts.length, 'тегов в поле').toBeGreaterThan(0)

		// Место между последним тегом и кнопкой есть — значит, она не «едет» за
		// тегами, а стоит у края. Без него проверки ниже пусты: кнопка вплотную
		// за тегом была бы у края и при снятом отступе
		expect(more.left - box(last).right, 'место между тегом и кнопкой').toBeGreaterThan(1)

		// Допуск на субпиксели
		expect(row.right - more.right, 'от кнопки до края ряда').toBeLessThan(2)
		expect(
			box(find('.s-select__field input', tagged)).left - more.right,
			'от кнопки до ввода',
		).toBeLessThan(12)
	})

	/**
	 * Кольцо кнопки выходит за неё на 4px, а режут его двое: сам ряд —
	 * `popover` обрезает то, что не поместилось, — и слот тегов, который
	 * обрезает тег шире себя. Край ряда и край слота у кнопки совпадают, и у
	 * кольца пропадала задняя сторона. Запас под кольцо — за краем обрезки у
	 * обоих (`tags/_tags.scss`, `select/_select.scss`), поэтому оба режут и по
	 * вертикали: проверяются обе оси.
	 */
	it('ни ряд, ни слот не срезают кольцо фокуса кнопки', async () => {
		render(pairHarness({ value: ALL_VALUES, texts: OPTIONS, overflow: 'popover' }))

		await expect.poll(() => document.querySelector('.s-tags__more')).not.toBeNull()

		const button = find('.s-select__field .s-tags__more')
		const row = find('.s-select__field .s-tags')
		const slot = find('.s-select__field .s-input__leading')

		// Кнопка — у самого края ряда и слота. Отойди она от края, кольцу было
		// бы куда выйти и без запаса, и проверка ниже прошла бы вхолостую
		expect(box(row).right - box(button).right, 'от кнопки до края ряда').toBeCloseTo(0, 1)
		expect(box(slot).right - box(button).right, 'от кнопки до края слота').toBeCloseTo(0, 1)

		// С клавиатуры: кольцо рисует `:focus-visible`. Остановки Tab в поле —
		// крестики тегов ряда, за ними кнопка
		for (let step = 0; step <= OPTIONS.length && document.activeElement !== button; step++) {
			await userEvent.keyboard('{Tab}')
		}

		expect(document.activeElement, 'фокус на кнопке «…»').toBe(button)

		for (const [area, name] of [
			[row, 'ряд'],
			[slot, 'слот'],
		] as const) {
			expectRingInsideHorizontally(button, area, `кнопка «…», ${name}`)
			expectRingInsideVertically(button, area, `кнопка «…», ${name}`)
		}
	})
})

/**
 * Случай из задачи: выбрано столько тегов, что хвост в панели не помещается.
 *
 * Размер панели держит панель Popover — её потолки ширины и высоты и её
 * прокрутка (`popover/_popover.scss`). Своего потолка у ряда тегов нет и быть
 * не должно: это был бы второй путь к тому же числу. Здесь проверяется, что
 * потолки работают и в поле, где ряд тегов — доля строки, а не контейнер.
 *
 * Сколько тегов осталось в ряду, а сколько уехало в панель, проверяет
 * `tags-overflow.spec.ts` — здесь важны границы окна и прокрутка.
 */
describe('панель хвоста в поле', () => {
	it('помещается в окно и прокручивает хвост внутри себя', async () => {
		render(pairHarness({ value: MANY_VALUES, texts: MANY_OPTIONS, overflow: 'popover' }))

		const { frame, content } = await openTailPanel()

		expectInsideWindow(frame, 'панель хвоста')

		// Хвост выше панели — иначе прокручивать нечего, и сторож пуст
		expect(content.scrollHeight, 'высота хвоста').toBeGreaterThan(content.clientHeight)
	})

	/**
	 * В `wrap` тег поля шире слота сжимается и обрезает текст многоточием:
	 * одному тегу переносить некуда. В панели так нельзя: ширину тега по его
	 * узлу помнит замер `TTagsOverflowPlugin`, и в открытой панели тоже, —
	 * сожмись тег по месту, замер погнался бы за собственным результатом.
	 */
	it('тег в панели остаётся натуральной ширины, а панель листает его вбок', async () => {
		render(pairHarness({ value: MANY_VALUES, texts: MANY_OPTIONS, overflow: 'popover' }))

		const { content, tail } = await openTailPanel()

		const texts = [
			...tail.querySelectorAll('.s-button:not(.s-tags-item__close) .s-button__text'),
		]

		expect(texts.length, 'тегов в панели').toBeGreaterThan(0)

		texts.forEach((text, index) => {
			expect(text.scrollWidth, `тег ${index}: текст обрезан`).toBeLessThanOrEqual(
				text.clientWidth,
			)
		})

		// Самый длинный тег шире панели — на то он и заведён. Сожмись он по
		// месту, панели было бы нечего листать, и проверка выше прошла бы
		// вхолостую: обрезать нечего, когда обрезать некуда.
		expect(content.scrollWidth, 'ширина хвоста').toBeGreaterThan(content.clientWidth)
	})
})
