/**
 * Запись `focused = true` ставит фокус туда, где он у компонента живёт.
 *
 * У поля корень — коробка вокруг `<input>`, у ListBox — рамка вокруг узла
 * списка с шапкой и подвалом, у Tabs — рамка со списком табов и панелями, у
 * полей даты — коробка вокруг частей, у календаря, группы радио, аккордеона,
 * тегов, пагинации и ленты — контейнер остановок, у элемента коллекции —
 * обёртка вокруг строки. Запись ставила фокус корню, а он его не держит:
 * фокус оставался, где был, а `focused` показывал неправду. Узел называет
 * правило дескриптора (`focusTarget` плагина действия). Правила по
 * отдельности проверяют `plugins/__tests__/action.plugin.spec.ts` и
 * `plugins/__tests__/focus-target.spec.ts`, здесь — что они находят узел в
 * настоящей разметке, в том числе когда перед главной частью стоит своя
 * остановка Tab, и берут остановку у модели, а не у разметки, которая в такте
 * смены ещё старая. А когда узла новой остановки в разметке ещё нет — день
 * нового месяца, новый таб, — запись ждёт его и ставит фокус после
 * перерисовки.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import {
	TAccordion,
	TAccordionItem,
	TCalendar,
	TCheckBox,
	TDateInput,
	TDatePicker,
	TInput,
	TListBox,
	TListBoxItem,
	TMenuCheckboxItem,
	TMenuItem,
	TMenuPopoverItem,
	TMenuRadioItem,
	TMenuSubmenu,
	TNumberInput,
	TPagination,
	TRadioGroup,
	TRadioGroupItem,
	TRating,
	TScroller,
	TSelect,
	TSelectItem,
	TSlider,
	TSwitch,
	TTabs,
	TTabsItem,
	TTags,
	TTagsItem,
	TTextarea,
	createEngineCalendar,
	createEngineTabs,
} from '@soldy-ui/core'
import {
	Accordion,
	AccordionItem,
	Calendar,
	CheckBox,
	DateInput,
	DatePicker,
	Input,
	ListBox,
	ListBoxItem,
	Menu,
	MenuCheckboxItem,
	MenuItem,
	MenuPopoverItem,
	MenuRadioGroup,
	MenuRadioItem,
	MenuSubmenu,
	NumberInput,
	Pagination,
	RadioGroup,
	RadioGroupItem,
	Rating,
	Scroller,
	Select,
	SelectItem,
	Slider,
	Switch,
	Tabs,
	TabsItem,
	Tags,
	TagsItem,
	Textarea,
} from '@soldy-ui/vue'

/**
 * Кадр: плагин действия встаёт по `ready` корня, а `TElementPlugin`
 * объявляет узел через `requestAnimationFrame`.
 */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

const components = {
	Accordion,
	AccordionItem,
	Calendar,
	CheckBox,
	DateInput,
	DatePicker,
	Input,
	ListBox,
	ListBoxItem,
	Menu,
	MenuCheckboxItem,
	MenuItem,
	MenuPopoverItem,
	MenuRadioGroup,
	MenuRadioItem,
	MenuSubmenu,
	NumberInput,
	Pagination,
	RadioGroup,
	RadioGroupItem,
	Rating,
	Scroller,
	Select,
	SelectItem,
	Slider,
	Switch,
	Tabs,
	TabsItem,
	Tags,
	TagsItem,
	Textarea,
}

type TCase = {
	/**
	 * Инстанс, которому пишут `focused`. Тип — только свойство: карта событий
	 * у каждого контрола своя, и общего типа инстанса у них нет.
	 */
	ctrl: () => { focused: boolean }
	/** Разметка; инстанс в ней — `ctrl`. Плоские имена: точка в строковом шаблоне не работает. */
	template: string
	/** Узел, который держит фокус компонента. */
	target: string
	/** Своя остановка Tab перед главной частью: фокус на неё уйти не должен. */
	before?: string
}

/**
 * Меню, открытое с первой отрисовки, с пунктом `a` перед пунктом теста: фокус
 * встаёт на строку своего пункта, а не на первую строку меню.
 */
const menu = (item: string) => `
	<Menu :open="true">
		<template #trigger="{ triggerAria }"><button v-bind="triggerAria">M</button></template>
		<MenuItem value="a" text="A" />
		${item}
	</Menu>
`

const CASES: Record<string, TCase> = {
	Input: { ctrl: () => new TInput(), template: '<Input :ctrl="ctrl" />', target: 'input' },
	'Input с кнопкой в leading': {
		ctrl: () => new TInput(),
		template: `
			<Input :ctrl="ctrl">
				<template #leading><button class="before">Найти</button></template>
			</Input>
		`,
		target: 'input',
		before: '.before',
	},
	NumberInput: {
		ctrl: () => new TNumberInput(),
		template: '<NumberInput :ctrl="ctrl" />',
		target: '.so-number-input__input',
	},
	Textarea: {
		ctrl: () => new TTextarea(),
		template: '<Textarea :ctrl="ctrl" />',
		target: 'textarea',
	},
	CheckBox: {
		ctrl: () => new TCheckBox(),
		template: '<CheckBox :ctrl="ctrl" />',
		target: 'input',
	},
	Switch: { ctrl: () => new TSwitch(), template: '<Switch :ctrl="ctrl" />', target: 'input' },
	Rating: { ctrl: () => new TRating(), template: '<Rating :ctrl="ctrl" />', target: 'input' },
	Slider: { ctrl: () => new TSlider(), template: '<Slider :ctrl="ctrl" />', target: 'input' },
	Select: {
		ctrl: () => new TSelect(),
		template: `
			<Select :ctrl="ctrl">
				<SelectItem value="a" text="A" />
			</Select>
		`,
		target: '.so-select__field input',
	},
	'Select multiple с тегами': {
		ctrl: () => new TSelect(),
		template: `
			<Select :ctrl="ctrl" mode="multiple" :value="['a', 'b']">
				<SelectItem value="a" text="A" />
				<SelectItem value="b" text="B" />
			</Select>
		`,
		target: '.so-select__field input',
		// Крестик тега — нативная остановка перед полем
		before: '.so-tags-item__close',
	},
	'RadioGroup.Item': {
		ctrl: () => new TRadioGroupItem({ value: 'b' }),
		template: `
			<RadioGroup>
				<RadioGroupItem value="a" />
				<RadioGroupItem :ctrl="ctrl" class="target" />
			</RadioGroup>
		`,
		target: '.target input',
	},
	ListBox: {
		ctrl: () => new TListBox(),
		template: `
			<ListBox :ctrl="ctrl">
				<ListBoxItem value="a" text="A" />
			</ListBox>
		`,
		target: '[role="listbox"]',
	},
	'ListBox с полем в header': {
		ctrl: () => new TListBox(),
		template: `
			<ListBox :ctrl="ctrl">
				<template #header><input class="before" /></template>
				<ListBoxItem value="a" text="A" />
			</ListBox>
		`,
		target: '[role="listbox"]',
		before: '.before',
	},
	Tabs: {
		ctrl: () => new TTabs(),
		template: `
			<Tabs :ctrl="ctrl">
				<TabsItem value="a" text="A" />
				<TabsItem value="b" text="B" active />
			</Tabs>
		`,
		target: '[role="tab"][aria-selected="true"]',
	},
	'Tabs с кнопкой в leading': {
		ctrl: () => new TTabs(),
		template: `
			<Tabs :ctrl="ctrl">
				<template #leading><button class="before">+</button></template>
				<TabsItem value="a" text="A" />
				<TabsItem value="b" text="B" active />
			</Tabs>
		`,
		target: '[role="tab"][aria-selected="true"]',
		before: '.before',
	},
	DateInput: {
		ctrl: () => new TDateInput(),
		template: '<DateInput :ctrl="ctrl" />',
		target: '.so-date-input__segment',
	},
	'DateInput с кнопкой в leading': {
		ctrl: () => new TDateInput(),
		template: `
			<DateInput :ctrl="ctrl">
				<template #leading><button class="before">Сегодня</button></template>
			</DateInput>
		`,
		target: '.so-date-input__segment',
		before: '.before',
	},
	'DatePicker, одна дата': {
		ctrl: () => new TDatePicker(),
		template: '<DatePicker :ctrl="ctrl" />',
		target: '.so-date-picker__field .so-date-input__segment',
	},
	'DatePicker, диапазон': {
		ctrl: () => new TDatePicker({ mode: 'range' }),
		template: '<DatePicker :ctrl="ctrl" />',
		target: '.so-date-picker__start .so-date-input__segment',
	},
	Calendar: {
		ctrl: () => new TCalendar(),
		template: '<Calendar :ctrl="ctrl" />',
		target: '.so-calendar-item[tabindex="0"]',
		// Заголовок месяца и кнопки листания — остановки перед сеткой
		before: '.so-calendar__title',
	},
	'RadioGroup с отметкой': {
		ctrl: () => new TRadioGroup(),
		template: `
			<RadioGroup :ctrl="ctrl" value="b">
				<RadioGroupItem value="a" />
				<RadioGroupItem value="b" class="target" />
			</RadioGroup>
		`,
		target: '.target input',
	},
	'RadioGroup без отметки, первое выключено': {
		ctrl: () => new TRadioGroup(),
		template: `
			<RadioGroup :ctrl="ctrl">
				<RadioGroupItem value="a" disabled />
				<RadioGroupItem value="b" class="target" />
			</RadioGroup>
		`,
		target: '.target input',
	},
	Accordion: {
		ctrl: () => new TAccordion(),
		template: `
			<Accordion :ctrl="ctrl">
				<AccordionItem value="a" text="A" class="target" />
				<AccordionItem value="b" text="B" />
			</Accordion>
		`,
		target: '.target .so-accordion-item__header',
	},
	'Accordion, первая секция выключена': {
		ctrl: () => new TAccordion(),
		template: `
			<Accordion :ctrl="ctrl">
				<AccordionItem value="a" text="A" disabled />
				<AccordionItem value="b" text="B" class="target" />
			</Accordion>
		`,
		target: '.target .so-accordion-item__header',
	},
	'Tags с выбором': {
		ctrl: () => new TTags(),
		template: `
			<Tags :ctrl="ctrl" mode="single" closable>
				<TagsItem value="a" text="A" />
				<TagsItem value="b" text="B" selected class="target" />
			</Tags>
		`,
		// Остановка — выбранный тег, а не крестик первого и не первая строка
		target: '.target [role="option"]',
	},
	'Tags без выбора': {
		ctrl: () => new TTags(),
		template: `
			<Tags :ctrl="ctrl" closable>
				<TagsItem value="a" text="A" class="target" />
				<TagsItem value="b" text="B" />
			</Tags>
		`,
		// У строк остановки нет — остановка набора — крестик первого тега
		target: '.target .so-tags-item__close',
	},
	Pagination: {
		ctrl: () => new TPagination(),
		template: '<Pagination :ctrl="ctrl" :total="50" :value="3" />',
		target: '[aria-current="page"]',
		// Стрелка «назад» на третьей странице включена — остановка перед страницами
		before: '.so-pagination__prev',
	},
	'Scroller со своими остановками': {
		ctrl: () => new TScroller(),
		template: `
			<Scroller :ctrl="ctrl">
				<button class="target">A</button>
				<button>B</button>
			</Scroller>
		`,
		target: '.target',
	},
	'Tabs.Item': {
		ctrl: () => new TTabsItem({ value: 'b', text: 'B' }),
		template: `
			<Tabs>
				<TabsItem value="a" text="A" active />
				<TabsItem :ctrl="ctrl" class="target" />
			</Tabs>
		`,
		target: '.target [role="tab"]',
	},
	'Accordion.Item': {
		ctrl: () => new TAccordionItem({ value: 'b', text: 'B' }),
		template: `
			<Accordion>
				<AccordionItem value="a" text="A" />
				<AccordionItem :ctrl="ctrl" class="target" />
			</Accordion>
		`,
		target: '.target .so-accordion-item__header',
	},
	'ListBox.Item': {
		ctrl: () => new TListBoxItem({ value: 'b', text: 'B' }),
		template: `
			<ListBox>
				<ListBoxItem value="a" text="A" />
				<ListBoxItem :ctrl="ctrl" class="target" />
			</ListBox>
		`,
		target: '.target [role="option"]',
	},
	'Tags.Item': {
		ctrl: () => new TTagsItem({ value: 'b', text: 'B' }),
		template: `
			<Tags closable>
				<TagsItem value="a" text="A" />
				<TagsItem :ctrl="ctrl" class="target" />
			</Tags>
		`,
		// Без выбора строка — `listitem` без `tabindex`: остановка тега — крестик
		target: '.target .so-tags-item__close',
	},
	'Tags.Item с выбором': {
		ctrl: () => new TTagsItem({ value: 'b', text: 'B' }),
		template: `
			<Tags mode="single" closable>
				<TagsItem value="a" text="A" />
				<TagsItem :ctrl="ctrl" class="target" />
			</Tags>
		`,
		// Строка-опция, хотя остановка набора у первого тега, а не крестик
		target: '.target [role="option"]',
	},
	'Menu.Item': {
		ctrl: () => new TMenuItem({ value: 'b', text: 'B' }),
		template: menu('<MenuItem :ctrl="ctrl" class="target" />'),
		target: '.target [role="menuitem"]',
	},
	'Menu.CheckboxItem': {
		ctrl: () => new TMenuCheckboxItem({ value: 'b', text: 'B' }),
		template: menu('<MenuCheckboxItem :ctrl="ctrl" class="target" />'),
		target: '.target [role="menuitemcheckbox"]',
	},
	'Menu.RadioItem': {
		ctrl: () => new TMenuRadioItem({ value: 'b', text: 'B' }),
		template: menu(`
			<MenuRadioGroup label="Вид">
				<MenuRadioItem :ctrl="ctrl" class="target" />
			</MenuRadioGroup>
		`),
		target: '.target [role="menuitemradio"]',
	},
	'Menu.Submenu': {
		ctrl: () => new TMenuSubmenu({ value: 'b', text: 'B' }),
		template: menu(`
			<MenuSubmenu :ctrl="ctrl" class="target">
				<MenuItem value="x" text="X" />
			</MenuSubmenu>
		`),
		target: '.target [role="menuitem"]',
	},
	'Menu.PopoverItem': {
		ctrl: () => new TMenuPopoverItem({ value: 'b', text: 'B' }),
		template: menu(`
			<MenuPopoverItem :ctrl="ctrl" class="target">
				<p>Панель</p>
			</MenuPopoverItem>
		`),
		target: '.target [role="menuitem"]',
	},
}

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

/** Смонтировать разметку в документ и дождаться кадра узлов. */
async function render(template: string, setup: () => object): Promise<void> {
	wrapper = mount({ components, setup, template }, { attachTo: document.body })

	await nextTick()
	await nextFrame()
}

/** Узел по селектору в документе; нет его — тест падает здесь. */
function nodeOf(selector: string): Element {
	const node = document.querySelector(selector)

	if (!node) throw new Error(`${selector}: узла нет`)

	return node
}

describe.each(Object.entries(CASES))('%s', (_name, { ctrl: create, template, target, before }) => {
	it('focused = true — фокус на узле компонента, false — снят', async () => {
		const ctrl = create()

		await render(template, () => ({ ctrl }))

		// Разбор не вхолостую: своя остановка перед главной частью есть
		if (before) expect(nodeOf(before)).toBeInstanceOf(HTMLElement)

		ctrl.focused = true

		expect(document.activeElement).toBe(nodeOf(target))
		expect(ctrl.focused).toBe(true)

		ctrl.focused = false

		expect(document.activeElement).toBe(document.body)
		expect(ctrl.focused).toBe(false)
	})
})

describe('Tabs · остановка по модели', () => {
	/**
	 * Активный таб сменился в том же такте, что и запись `focused`: Vue
	 * перерисует `tabindex` только в следующем, а остановку правило берёт у
	 * модели, — фокус встаёт на новый таб, а не на прежнюю остановку.
	 */
	it('смена активного и focused = true в одном такте — фокус на новом табе', async () => {
		const ctrl = new TTabs()
		const engine = createEngineTabs({
			items: [
				{ value: 'a', text: 'A', _: { active: true } },
				{ value: 'b', text: 'B' },
			],
		})

		wrapper = mount(Tabs, { props: { ctrl, engine }, attachTo: document.body })

		await nextTick()
		await nextFrame()

		const b = engine.extensions.batch.items.find((item) => item.value === 'b')

		if (!b) throw new Error('таба b нет')

		engine.extensions.activation.activate(b)

		// Такт тот же: остановка в разметке ещё у прежнего активного
		expect(nodeOf('[role="tab"][tabindex="0"]').textContent?.trim()).toBe('A')

		ctrl.focused = true

		expect(document.activeElement?.textContent?.trim()).toBe('B')
		expect(document.activeElement?.getAttribute('role')).toBe('tab')
	})

	/**
	 * Таб добавили в движок и сделали активным в том же такте, что и запись
	 * `focused`: остановка в модели — он, а его узла в разметке нет, и корень
	 * Tabs фокус не держит. Запись ждёт узла: Vue нарисует таб в следующем
	 * такте, его узел объявят кадром позже — и фокус встанет на него.
	 */
	it('новый таб и focused = true в одном такте — после перерисовки фокус на нём', async () => {
		const ctrl = new TTabs()
		const engine = createEngineTabs({ items: [{ value: 'a', text: 'A', _: { active: true } }] })

		wrapper = mount(Tabs, { props: { ctrl, engine }, attachTo: document.body })

		await nextTick()
		await nextFrame()

		engine.extensions.activation.activate(
			engine.extensions.plain.push({ value: 'c', text: 'C' }),
		)
		ctrl.focused = true

		// Такт тот же: таба в разметке нет, фокуса — тоже, а запись не откатилась
		expect(document.querySelectorAll('[role="tab"]')).toHaveLength(1)
		expect(document.activeElement).toBe(document.body)
		expect(ctrl.focused).toBe(true)

		await nextTick()
		await nextFrame()

		expect(document.activeElement?.textContent?.trim()).toBe('C')
		expect(document.activeElement?.getAttribute('role')).toBe('tab')
		expect(ctrl.focused).toBe(true)
	})
})

describe('Calendar · остановка по модели', () => {
	/**
	 * Фокус коллекции ушёл в месяц второй сетки в том же такте, что и запись
	 * `focused`: Vue перенесёт `tabindex` в следующем, а остановку правило берёт
	 * у модели (`focusedDate`), — фокус встаёт на день того месяца, а не на
	 * прежнюю остановку в первой сетке. Сеток две: день месяца, который в такте
	 * листания только показывается, в разметке ещё не нарисован.
	 */
	it('фокус коллекции в другом месяце и focused = true в одном такте — фокус на его дне', async () => {
		const ctrl = new TCalendar({ months: ['2026-01-01', '2026-02-01'] })
		const engine = createEngineCalendar()

		wrapper = mount(Calendar, { props: { ctrl, engine }, attachTo: document.body })

		await nextTick()
		await nextFrame()

		const stop = () => nodeOf('.so-calendar-item[tabindex="0"]')
		const before = stop()

		engine.extensions.focus.focusDate('2026-02-10')

		// Такт тот же: остановка в разметке ещё в январе
		expect(stop()).toBe(before)
		expect(engine.extensions.focus.focusedDate).toBe('2026-02-10')

		ctrl.focused = true

		const day = document.activeElement

		expect(day).not.toBe(before)
		expect(day?.classList.contains('so-calendar-item')).toBe(true)
		expect(day?.textContent?.trim()).toBe('10')
		expect(day?.closest('.so-calendar__month')).toBe(
			document.querySelectorAll('.so-calendar__month')[1],
		)
	})

	/**
	 * Сетка одна, и листание в том же такте, что и запись `focused`, увело
	 * фокус коллекции в месяц, которого в разметке ещё нет: правило дня не
	 * находит, а корень календаря фокус не держит. Запись ждёт узла: Vue
	 * нарисует дни нового месяца в следующем такте, их узлы объявят кадром
	 * позже — и фокус встанет на день `focusedDate`.
	 */
	it('одна сетка: showNext() и focused = true в одном такте — после перерисовки фокус на дне нового месяца', async () => {
		const ctrl = new TCalendar({ months: ['2026-01-01'] })
		const engine = createEngineCalendar()

		wrapper = mount(Calendar, { props: { ctrl, engine }, attachTo: document.body })

		await nextTick()
		await nextFrame()

		const { focus, view } = engine.extensions

		view.showNext()
		ctrl.focused = true

		const date = focus.focusedDate

		// Такт тот же: фокус коллекции в феврале, а разметка ещё январская
		expect(date.startsWith('2026-02-')).toBe(true)
		expect(nodeOf('.so-calendar__title-text').textContent?.trim()).not.toBe(
			view.grids[0]?.title,
		)
		expect(document.activeElement).toBe(document.body)
		expect(ctrl.focused).toBe(true)

		await nextTick()
		await nextFrame()

		const day = document.activeElement

		expect(nodeOf('.so-calendar__title-text').textContent?.trim()).toBe(view.grids[0]?.title)
		expect(day).toBe(nodeOf('.so-calendar-item[tabindex="0"]'))
		expect(day?.textContent?.trim()).toBe(String(Number(date.slice(-2))))
		expect(ctrl.focused).toBe(true)
	})

	/**
	 * Пока открыта панель выбора месяца и года, сетка под её подложкой, и
	 * остановка календаря — список панели.
	 */
	it('панель выбора открыта — фокус на её списке, а не на дне под подложкой', async () => {
		const ctrl = new TCalendar()
		const engine = createEngineCalendar()

		wrapper = mount(Calendar, { props: { ctrl, engine }, attachTo: document.body })

		await nextTick()
		await nextFrame()

		const picker = engine.extensions.picker.pickers[0]

		if (!picker) throw new Error('панели выбора нет')

		picker.popover.open = true
		await nextTick()
		await nextFrame()

		// Фокус увели из календаря, а панель открыта
		ctrl.focused = false

		expect(picker.popover.open).toBe(true)

		ctrl.focused = true

		expect(document.activeElement).toBe(nodeOf('.so-calendar__picker-list [role="listbox"]'))
		expect(ctrl.focused).toBe(true)
	})
})

describe('RadioGroup · отметка по модели', () => {
	/**
	 * Значение сменилось в том же такте, что и запись `focused`: Vue перепишет
	 * `checked` полей в следующем, а отмеченное радио правило берёт у модели,
	 * — фокус встаёт на новое радио, а не на прежнее.
	 */
	it('смена значения и focused = true в одном такте — фокус на новом радио', async () => {
		const ctrl = new TRadioGroup({ value: 'a' })

		await render(
			`
				<RadioGroup :ctrl="ctrl">
					<RadioGroupItem value="a" />
					<RadioGroupItem value="b" class="target" />
				</RadioGroup>
			`,
			() => ({ ctrl }),
		)

		ctrl.value = 'b'

		// Такт тот же: отмечено в разметке ещё прежнее
		expect(nodeOf('input:checked')).not.toBe(nodeOf('.target input'))

		ctrl.focused = true

		expect(document.activeElement).toBe(nodeOf('.target input'))
	})
})

describe('Scroller · вьюпорт — остановка', () => {
	/**
	 * Своих остановок в ленте нет, а листать есть куда: остановка — сам
	 * вьюпорт. Замер в jsdom нулевой, поэтому факт приносит инстанс — как
	 * `scroller.spec.ts`.
	 */
	it('своих остановок нет — фокус на вьюпорте, а не на кнопке «вперёд»', async () => {
		const ctrl = new TScroller()

		await render(
			`
				<Scroller :ctrl="ctrl">
					<span>A</span>
				</Scroller>
			`,
			() => ({ ctrl }),
		)

		ctrl.notifyViewport({ canPrev: false, canNext: true, hasTabStops: false })
		await nextTick()

		ctrl.focused = true

		expect(document.activeElement).toBe(nodeOf('.so-scroller__viewport'))
		expect(ctrl.focused).toBe(true)
	})
})

describe('Select.Item · фокус остаётся на поле', () => {
	/**
	 * У комбобокса DOM-фокус всегда на поле, а подсвеченную опцию объявляет
	 * `aria-activedescendant`: правила у опции нет, и запись её `focused`
	 * фокус с поля не уводит.
	 */
	it('focused = true у опции фокус с поля не уводит', async () => {
		const select = new TSelect()
		const item = new TSelectItem({ value: 'b', text: 'B' })

		await render(
			`
				<Select :ctrl="select">
					<SelectItem value="a" text="A" />
					<SelectItem :ctrl="item" />
				</Select>
			`,
			() => ({ select, item }),
		)

		select.focused = true

		const field = nodeOf('.so-select__field input')

		expect(document.activeElement).toBe(field)

		item.focused = true

		expect(document.activeElement).toBe(field)
	})
})
