/**
 * Label в настоящем браузере: связь подписи с контролом, её раскладка и
 * подсветка контрола при наведении на текст.
 *
 * Подпись связана с контролом вложением, без `for` и `id`: контрол — первый
 * labelable-потомок `label`. Клик по тексту браузер доводит до поля, а имя
 * поля собирает из всего текста внутри `label`. Ни то ни другое jsdom честно
 * не выполняет, и раскладку сторон и выравнивание по первой строке он не
 * считает вовсе — поэтому спек браузерный.
 *
 * Наведение тем более: в jsdom нет ни указателя, ни каскада. Здесь и проверяется
 * сам договор — с текста подписи контрол выглядит так же, как под курсором, — а
 * держит его правило темы: наведение на подпись подписанному полю отдают не все
 * браузеры. Что правило на месте, сторожит `themes/oren/__tests__/label-hover.spec.ts`:
 * здешний Chromium наведение полю отдаёт сам, и без правила темы прогон остался
 * бы зелёным.
 *
 * Обратная сторона того же договора — в конце файла: контрол только для чтения
 * клик не меняет, и наведение на него не красит ничего и не показывает руки ни
 * на контроле, ни на тексте подписи.
 *
 * Проверяются три контрола, которые подписывает Label: CheckBox, Switch и
 * радио. Радио внутри подписи — с `tag="span"`: его корень — тоже `label`.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { page, userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick, type Component, type VNode } from 'vue'
import type { TComponentSize, TDirection, TLabelPosition } from '@soldy-ui/core'
import { CheckBox, Label, RadioGroup, Switch } from '@soldy-ui/vue'

import '@soldy-ui/theme-oren'

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

const TEXT = 'Согласен'

/** Длинная подпись: в узкой сцене переносится на несколько строк. */
const LONG_TEXT = 'Согласен с условиями обработки данных и получения писем о новостях сервиса'

type TProps = Record<string, unknown>

/** Где текст относительно контрола на экране. */
type TSide = 'left' | 'right' | 'above' | 'below'

type TCase = {
	name: string
	/** Роль поля: по ней и имени `getByRole` ищет контрол. */
	role: string
	/** Видимая часть контрола — её центр ровняется по первой строке текста. */
	box: string
	/** Что контрол отдаёт v-model, когда клик его отметил. */
	picked: unknown
	/** Разметка: подпись с пропами `label` и контрол с пропами `control`. */
	tree: (label: TProps, control: TProps) => VNode
}

const CASES: readonly TCase[] = [
	{
		name: 'CheckBox',
		role: 'checkbox',
		box: '.s-check-box',
		picked: true,
		// Текст в слоте отметки: в имя его не пускает `aria-hidden` коробки
		tree: (label, control) => h(Label, label, () => h(CheckBox, control, { icon: () => 'V' })),
	},
	{
		name: 'Switch',
		role: 'switch',
		box: '.s-switch__track',
		picked: true,
		// Текст в слотах ручки: в имя его не пускает `aria-hidden` дорожки
		tree: (label, control) =>
			h(Label, label, () => h(Switch, control, { on: () => 'I', off: () => 'O' })),
	},
	{
		name: 'RadioGroup.Item',
		role: 'radio',
		box: '.s-radio-group-item__control',
		picked: 'a',
		// Группа раздаёт радио `size` и собирает v-model
		tree: (label, control) =>
			h(RadioGroup as Component, control, () =>
				h(Label, label, () => h(RadioGroup.Item, { value: 'a', tag: 'span' })),
			),
	},
]

/** Место, куда уводится указатель: наведение красит контрол, и сцены монтируются на одном месте. */
const AWAY = '.s-test-away'

/**
 * Смонтировать разметку и дождаться кадра: слушатели поля плагины вешают по
 * `ready`. Указатель уводится с подписи: он остаётся там, где его бросил
 * предыдущий тест, и над подписью красил бы контрол ещё до наведения.
 */
async function show(content: () => VNode, width?: number): Promise<void> {
	render(
		defineComponent({
			render: () =>
				h('div', { style: width ? `width: ${width}px` : undefined }, [
					h('div', { class: 's-test-away', style: 'height: 24px' }),
					content(),
				]),
		}),
	)

	await nextTick()
	await nextFrame()
	await hover(AWAY)
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
function find(selector: string): Element {
	const element = document.querySelector(selector)

	if (!element) throw new Error(`${selector}: узла нет`)

	return element
}

/**
 * Переход цвета контрола доигрывает, прежде чем цвет читают.
 * `getAnimations()` сам пересчитывает стили, поэтому переход, запущенный
 * наведением, в списке уже есть.
 */
const settled = (element: Element) =>
	Promise.all(element.getAnimations({ subtree: true }).map((animation) => animation.finished))

/** Навести указатель и дождаться, пока цвет перестанет меняться. */
async function hover(selector: string): Promise<void> {
	await userEvent.hover(find(selector))
	// Кадр — чтобы браузер успел разобрать движение указателя: ввод он
	// обрабатывает до отрисовки, а перехода до этого ещё нет.
	await nextFrame()
	await settled(document.body)
}

/** Чем покрашена часть контрола: наведение меняет рамку, фон или и то и другое. */
function paintOf(selector: string): Record<string, string> {
	const style = getComputedStyle(find(selector))

	return { background: style.backgroundColor, border: style.borderTopColor }
}

/**
 * Курсор, который пользователь видит над узлом. Берётся не с самого узла, а с
 * того, что лежит в его середине сверху: поле CheckBox перекрывает коробку, а
 * поле readonly-Switch не участвует в попадании (`pointer-events: none`), и
 * курсор там показывает уже дорожка.
 */
function cursorAt(selector: string): string {
	const { left, top, width, height } = find(selector).getBoundingClientRect()
	const target = document.elementFromPoint(left + width / 2, top + height / 2)

	if (!target) throw new Error(`${selector}: в середине узла никого`)

	return getComputedStyle(target).cursor
}

/** Поле контрола в подписи. */
function input(): HTMLInputElement {
	const element = find('.s-label input')

	if (!(element instanceof HTMLInputElement)) throw new Error('поля в подписи нет')

	return element
}

/**
 * Прямоугольники строк текста подписи: по одному на строку.
 *
 * Текстовый узел ищется среди детей: вокруг содержимого слота Vue ставит
 * пустые узлы-якоря фрагмента, и у них прямоугольников нет.
 */
function lines(): DOMRect[] {
	const text = [...find('.s-label__text').childNodes].find(
		(node) => node instanceof Text && node.data.trim() !== '',
	)

	if (!text) throw new Error('текста в подписи нет')

	const range = document.createRange()

	range.selectNodeContents(text)

	return [...range.getClientRects()]
}

const middle = (rect: DOMRect): number => rect.top + rect.height / 2

beforeEach(() => {
	document.documentElement.dataset.theme = 'oren'
})

afterEach(() => {
	cleanup()
})

describe.each(CASES)('$name в подписи', ({ role, box, picked, tree }) => {
	/**
	 * Клик по тексту браузер отдаёт полю вторым кликом, и поле меняется один
	 * раз. Предки подписи получают оба клика — так ведёт себя любой `label`, и
	 * гасить второй не нужно: `change` приходит один.
	 */
	it('клик по тексту переключает контрол один раз', async () => {
		const values: unknown[] = []
		let changes = 0

		await show(() =>
			tree({ text: TEXT }, { 'onUpdate:value': (value: unknown) => values.push(value) }),
		)

		input().addEventListener('change', () => changes++)

		await userEvent.click(find('.s-label__text'))

		expect(input().checked).toBe(true)
		expect(changes).toBe(1)
		await expect.poll(() => values).toEqual([picked])
	})

	/**
	 * Имя — весь текст внутри `label`. Декор контрола (слоты отметки и ручки)
	 * скрыт `aria-hidden`, распорка выравнивания — `invisible`, поэтому имя
	 * совпадает с текстом подписи точно — и до клика, и после.
	 */
	it('имя поля — ровно текст подписи', async () => {
		await show(() => tree({ text: TEXT }, {}))

		const named = () => page.getByRole(role, { name: TEXT, exact: true }).query()

		expect(named()).toBe(input())

		await userEvent.click(find('.s-label__text'))
		await nextFrame()

		expect(input().checked).toBe(true)
		expect(named()).toBe(input())
	})

	/**
	 * Сбоку от текста контрол стоит по центру первой строки, а не всего
	 * абзаца — какой бы ни была высота контрола относительно строки. Размеры
	 * подписи и контрола задаются порознь, поэтому проверяются и несовпавшие:
	 * контрол выше строки (`sm` у подписи, `2xl` у контрола) и ниже её.
	 */
	it.each(['start', 'end'] as const)(
		'сбоку (%s) контрол — по центру первой строки',
		async (position) => {
			const pairs = [
				['sm', 'sm'],
				['normal', 'normal'],
				['2xl', '2xl'],
				['sm', '2xl'],
				['2xl', 'sm'],
			] satisfies [TComponentSize, TComponentSize][]

			for (const [labelSize, controlSize] of pairs) {
				const sizes = `подпись ${labelSize}, контрол ${controlSize}`

				await show(
					() =>
						tree({ text: LONG_TEXT, position, size: labelSize }, { size: controlSize }),
					180,
				)

				const rows = lines()
				const control = find(box).getBoundingClientRect()

				expect(rows.length, `${sizes}: подпись в несколько строк`).toBeGreaterThan(1)
				expect(
					Math.abs(middle(control) - middle(rows[0])),
					`${sizes}: центр контрола и первой строки`,
				).toBeLessThanOrEqual(1)

				cleanup()
			}
		},
	)

	/**
	 * Порядок в DOM один — контрол, потом текст; сторону рисует тема. `start`
	 * и `end` логические: в RTL текст встаёт с другой стороны сам.
	 */
	it.each([
		['ltr', 'start', 'left'],
		['ltr', 'end', 'right'],
		['rtl', 'start', 'right'],
		['rtl', 'end', 'left'],
		['ltr', 'top', 'above'],
		['rtl', 'bottom', 'below'],
	] satisfies [TDirection, TLabelPosition, TSide][])(
		'%s, %s — текст %s от контрола',
		async (direction, position, side) => {
			await show(() => tree({ text: TEXT, position, direction }, {}))

			const text = find('.s-label__text').getBoundingClientRect()
			const control = find('.s-label__control').getBoundingClientRect()

			const placed: Record<TSide, boolean> = {
				left: text.right <= control.left,
				right: text.left >= control.right,
				above: text.bottom <= control.top,
				below: text.top >= control.bottom,
			}

			expect(placed[side]).toBe(true)
		},
	)
})

type THoverCase = {
	name: string
	/** Часть контрола, которую красит наведение. */
	paint: string
	/** Состояние контрола: в разных состояниях красят разные правила темы. */
	props: TProps
	/** Разметка: подпись с текстом и контрол с этими пропами. */
	tree: (control: TProps) => VNode
}

/** Подпись с коробкой: вид и отметку задают пропы случая. */
const checkBox = (control: TProps): VNode => h(Label, { text: TEXT }, () => h(CheckBox, control))

/**
 * Корень контрола: наводим на него, а не на крашеную часть. Поле CheckBox и
 * Switch лежит поверх коробки и дорожки, и на перекрытый узел указатель не
 * встанет.
 */
const CONTROL = '.s-label__control > *'

const HOVER: readonly THoverCase[] = [
	{ name: 'CheckBox', paint: '.s-check-box__container', props: {}, tree: checkBox },
	{
		name: 'CheckBox filled',
		paint: '.s-check-box__container',
		props: { view: 'filled' },
		tree: checkBox,
	},
	{
		// Отмеченную коробку `filled` красит своё правило, а не то же самое
		name: 'CheckBox filled отмеченный',
		paint: '.s-check-box__container',
		props: { view: 'filled', value: true },
		tree: checkBox,
	},
	{
		name: 'Switch',
		paint: '.s-switch__track',
		props: {},
		tree: (control) => h(Label, { text: TEXT }, () => h(Switch, control)),
	},
	{
		// Выключает радио и группа: `disabled` случая уходит на неё
		name: 'RadioGroup.Item',
		paint: '.s-radio-group-item__control',
		props: {},
		tree: (control) =>
			h(RadioGroup as Component, control, () =>
				h(Label, { text: TEXT }, () => h(RadioGroup.Item, { value: 'a', tag: 'span' })),
			),
	},
]

/**
 * Клик по тексту подписи контрол переключает, поэтому и курсор на тексте
 * обязан выглядеть как курсор на самом контроле. Браузеры здесь расходятся:
 * Firefox отдаёт наведение подписи подписанному полю, Chromium — нет, и
 * подсветка держится на контексте наведённой подписи в теме.
 *
 * Цвета тест не знает — их решает дизайн (`themes/oren/AGENTS.md`, «Что тестом
 * не проверяется»). Знает отношения: с текста и с контрола цвет один, а без
 * указателя другой.
 */
describe.each(HOVER)('$name в подписи: наведение', ({ paint, props, tree }) => {
	it('на текст красит контрол так же, как на сам контрол', async () => {
		await show(() => tree(props))

		const rest = paintOf(paint)

		await hover(CONTROL)

		const hovered = paintOf(paint)

		expect(hovered, 'наведение на контрол его красит').not.toEqual(rest)

		await hover(AWAY)

		expect(paintOf(paint), 'без указателя цвет возвращается').toEqual(rest)

		await hover('.s-label__text')

		expect(paintOf(paint)).toEqual(hovered)
	})

	/** Выключенный контрол кликом не переключить — и красить его нечем. */
	it('на текст не красит выключенный контрол', async () => {
		await show(() => tree({ ...props, disabled: true }))

		const rest = paintOf(paint)

		await hover('.s-label__text')

		expect(paintOf(paint)).toEqual(rest)
	})
})

/**
 * Контрол только для чтения. Радио сюда не входит: `readonly` у него нет — оно
 * не наследник `TInputControl`.
 */
const READONLY: readonly THoverCase[] = HOVER.filter(({ name }) => !name.startsWith('RadioGroup'))

/**
 * Клик по readonly-контролу его не меняет — `TInputBoolPlugin` отменяет сам
 * клик, — поэтому отклика на наведение у него быть не должно: ни подсветки, ни
 * руки. Иначе пользователь видит отклик, жмёт и не получает ничего.
 *
 * Прямое наведение и наведение на текст подписи проверяются порознь: у Switch
 * поле readonly не участвует в попадании (`pointer-events: none`), и с самого
 * контрола подсветка не приходила и раньше, а через подпись — приходит.
 */
describe.each(READONLY)('$name только для чтения', ({ paint, props, tree }) => {
	it('наведение не красит его ни с контрола, ни с текста подписи', async () => {
		await show(() => tree({ ...props, readonly: true }))

		const rest = paintOf(paint)

		await hover(CONTROL)

		expect(paintOf(paint), 'наведение на контрол').toEqual(rest)

		await hover('.s-label__text')

		expect(paintOf(paint), 'наведение на текст подписи').toEqual(rest)
	})

	it('курсор обычный и на контроле, и на тексте подписи', async () => {
		await show(() => tree(props))

		expect(cursorAt(CONTROL), 'изменяемый контрол — рука').toBe('pointer')
		expect(cursorAt('.s-label__text'), 'его подпись — рука').toBe('pointer')

		cleanup()
		await show(() => tree({ ...props, readonly: true }))

		expect(cursorAt(CONTROL), 'readonly-контрол').toBe('default')
		expect(cursorAt('.s-label__text'), 'подпись readonly-контрола').toBe('default')
	})
})
