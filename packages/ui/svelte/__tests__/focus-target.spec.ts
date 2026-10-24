/**
 * Запись `focused = true` ставит фокус туда, где он у компонента живёт.
 *
 * Сценарии — те же, что у Vue (`focus-target.spec.ts`) и React
 * (`focus-target.spec.tsx`), по компонентам адаптера. У поля корень — коробка
 * вокруг `<input>`, у поля даты и DatePicker — коробка вокруг частей, у
 * календаря — сетки с заголовками и кнопками листания, у Select — рамка вокруг
 * поля и тегов, у ListBox — рамка вокруг узла списка, у Tabs — рамка со
 * списком табов и панелями, у группы радио, аккордеона и набора тегов —
 * контейнер остановок, у элемента коллекции — обёртка вокруг строки; узел
 * фокуса называет правило дескриптора (`focusTarget` плагина действия).
 *
 * Своё у Svelte — такт: смену состояния он применяет к DOM на своём такте, и
 * до `flushSync()` разметка отстаёт от модели.
 */

import { describe, it, expect } from 'vitest'
import { flushSync } from 'svelte'
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
	Calendar,
	CheckBox,
	DateInput,
	DatePicker,
	Input,
	ListBox,
	NumberInput,
	Pagination,
	Rating,
	Scroller,
	Slider,
	Switch,
	Tabs,
	Textarea,
} from '@soldy-ui/svelte'
import AccordionHarness from './Accordion.test.svelte'
import SelectHarness from './Select.test.svelte'
import TagsHarness from './Tags.test.svelte'
import ListBoxHarness from './ListBox.test.svelte'
import MenuHarness, { type TMenuFocusKind } from './Menu.test.svelte'
import RadioGroupHarness from './RadioGroup.test.svelte'
import TabsHarness from './Tabs.test.svelte'
import { find, mount, nextFrame } from './mount'
import { markup } from './snippets.svelte'

type TCase = {
	/**
	 * Монтирует компонент и отдаёт инстанс, которому тест пишет `focused`. Тип
	 * инстанса — только свойство: карта событий у каждого контрола своя.
	 */
	render: () => { focused: boolean }
	/** Узел, который держит фокус компонента. */
	target: string
	/** Своя остановка Tab перед главной частью: фокус на неё уйти не должен. */
	before?: string
}

const CASES: Record<string, TCase> = {
	Input: {
		render: () => {
			const ctrl = new TInput()

			mount(Input, { ctrl })

			return ctrl
		},
		target: 'input',
	},
	'Input с кнопкой в leading': {
		render: () => {
			const ctrl = new TInput()

			mount(Input, { ctrl, leading: markup('<button class="before"></button>') })

			return ctrl
		},
		target: 'input',
		before: '.before',
	},
	NumberInput: {
		render: () => {
			const ctrl = new TNumberInput()

			mount(NumberInput, { ctrl })

			return ctrl
		},
		target: '.so-number-input__input',
	},
	'NumberInput с кнопкой в leading': {
		render: () => {
			const ctrl = new TNumberInput()

			mount(NumberInput, { ctrl, leading: markup('<button class="before"></button>') })

			return ctrl
		},
		target: '.so-number-input__input',
		before: '.before',
	},
	// У поля даты фокус держат части, а корень — коробка вокруг ряда
	DateInput: {
		render: () => {
			const ctrl = new TDateInput()

			mount(DateInput, { ctrl })

			return ctrl
		},
		target: '.so-date-input__segment',
	},
	'DateInput с кнопкой в leading': {
		render: () => {
			const ctrl = new TDateInput()

			mount(DateInput, { ctrl, leading: markup('<button class="before">Сегодня</button>') })

			return ctrl
		},
		target: '.so-date-input__segment',
		before: '.before',
	},
	'DatePicker, одна дата': {
		render: () => {
			const ctrl = new TDatePicker()

			mount(DatePicker, { ctrl })

			return ctrl
		},
		target: '.so-date-picker__field .so-date-input__segment',
	},
	'DatePicker, диапазон': {
		render: () => {
			const ctrl = new TDatePicker({ mode: 'range' })

			mount(DatePicker, { ctrl })

			return ctrl
		},
		target: '.so-date-picker__start .so-date-input__segment',
	},
	Calendar: {
		render: () => {
			const ctrl = new TCalendar()

			mount(Calendar, { ctrl })

			return ctrl
		},
		target: '.so-calendar-item[tabindex="0"]',
		// Заголовок месяца и кнопки листания — остановки перед сеткой
		before: '.so-calendar__title',
	},
	Textarea: {
		render: () => {
			const ctrl = new TTextarea()

			mount(Textarea, { ctrl })

			return ctrl
		},
		target: 'textarea',
	},
	CheckBox: {
		render: () => {
			const ctrl = new TCheckBox()

			mount(CheckBox, { ctrl })

			return ctrl
		},
		target: 'input',
	},
	Switch: {
		render: () => {
			const ctrl = new TSwitch()

			mount(Switch, { ctrl })

			return ctrl
		},
		target: 'input',
	},
	Rating: {
		render: () => {
			const ctrl = new TRating()

			mount(Rating, { ctrl })

			return ctrl
		},
		target: 'input',
	},
	Slider: {
		render: () => {
			const ctrl = new TSlider()

			mount(Slider, { ctrl })

			return ctrl
		},
		target: 'input',
	},
	Pagination: {
		render: () => {
			const ctrl = new TPagination()

			mount(Pagination, { ctrl, total: 50, value: 3 })

			return ctrl
		},
		target: '[aria-current="page"]',
		// Стрелка «назад» на третьей странице включена — остановка перед страницами
		before: '.so-pagination__prev',
	},
	'Scroller со своими остановками': {
		render: () => {
			const ctrl = new TScroller()

			mount(Scroller, { ctrl, children: markup('<button class="target">A</button>') })

			return ctrl
		},
		target: '.target',
	},
	'RadioGroup.Item': {
		render: () => {
			const ctrl = new TRadioGroupItem({ value: 'b' })

			mount(RadioGroupHarness, {
				items: [{ value: 'a' }, { ctrl, value: 'b', class: 'target' }],
			})

			return ctrl
		},
		target: '.target input',
	},
	ListBox: {
		render: () => {
			const ctrl = new TListBox()

			mount(ListBox, { ctrl, items: [{ value: 'a', text: 'A' }] })

			return ctrl
		},
		target: '[role="listbox"]',
	},
	'ListBox с полем в header': {
		render: () => {
			const ctrl = new TListBox()

			mount(ListBox, {
				ctrl,
				items: [{ value: 'a', text: 'A' }],
				header: markup('<input class="before" />'),
			})

			return ctrl
		},
		target: '[role="listbox"]',
		before: '.before',
	},
	Tabs: {
		render: () => {
			const ctrl = new TTabs()

			mount(Tabs, { ctrl, items: TABS })

			return ctrl
		},
		target: '[role="tab"][aria-selected="true"]',
	},
	'Tabs с кнопкой в leading': {
		render: () => {
			const ctrl = new TTabs()

			mount(Tabs, { ctrl, items: TABS, leading: markup('<button class="before"></button>') })

			return ctrl
		},
		target: '[role="tab"][aria-selected="true"]',
		before: '.before',
	},
	'RadioGroup с отметкой': {
		render: () => {
			const ctrl = new TRadioGroup({ value: 'b' })

			mount(RadioGroupHarness, {
				group: { ctrl },
				items: [{ value: 'a' }, { value: 'b', class: 'target' }],
			})

			return ctrl
		},
		target: '.target input',
	},
	'RadioGroup без отметки, первое выключено': {
		render: () => {
			const ctrl = new TRadioGroup()

			mount(RadioGroupHarness, {
				group: { ctrl },
				items: [
					{ value: 'a', disabled: true },
					{ value: 'b', class: 'target' },
				],
			})

			return ctrl
		},
		target: '.target input',
	},
	Accordion: {
		render: () => {
			const ctrl = new TAccordion()

			mount(AccordionHarness, {
				accordion: { ctrl },
				items: [
					{ value: 'a', text: 'A', class: 'target' },
					{ value: 'b', text: 'B' },
				],
			})

			return ctrl
		},
		target: '.target .so-accordion-item__header',
	},
	'Accordion, первая секция выключена': {
		render: () => {
			const ctrl = new TAccordion()

			mount(AccordionHarness, {
				accordion: { ctrl },
				items: [
					{ value: 'a', text: 'A', disabled: true },
					{ value: 'b', text: 'B', class: 'target' },
				],
			})

			return ctrl
		},
		target: '.target .so-accordion-item__header',
	},
	'Tabs.Item': {
		render: () => {
			const ctrl = new TTabsItem({ value: 'b', text: 'B' })

			mount(TabsHarness, {
				items: [
					{ value: 'a', text: 'A', active: true },
					{ ctrl, value: 'b', class: 'target' },
				],
			})

			return ctrl
		},
		target: '.target [role="tab"]',
	},
	'Accordion.Item': {
		render: () => {
			const ctrl = new TAccordionItem({ value: 'b', text: 'B' })

			mount(AccordionHarness, {
				items: [
					{ value: 'a', text: 'A' },
					{ ctrl, value: 'b', class: 'target' },
				],
			})

			return ctrl
		},
		target: '.target .so-accordion-item__header',
	},
	Select: {
		render: () => {
			const ctrl = new TSelect()

			mount(SelectHarness, { select: { ctrl }, items: [{ value: 'a', text: 'A' }] })

			return ctrl
		},
		target: '.so-select__field input',
	},
	'Select multiple с тегами': {
		render: () => {
			const ctrl = new TSelect()

			mount(SelectHarness, {
				select: { ctrl, mode: 'multiple', value: ['a', 'b'] },
				items: [
					{ value: 'a', text: 'A' },
					{ value: 'b', text: 'B' },
				],
			})

			return ctrl
		},
		target: '.so-select__field input',
		// Крестик тега — нативная остановка перед полем
		before: '.so-tags-item__close',
	},
	'Tags с выбором': {
		render: () => {
			const ctrl = new TTags()

			mount(TagsHarness, {
				tags: { ctrl, mode: 'single', closable: true },
				items: [
					{ value: 'a', text: 'A' },
					{ value: 'b', text: 'B', selected: true, class: 'target' },
				],
			})

			return ctrl
		},
		// Остановка — выбранный тег, а не крестик первого и не первая строка
		target: '.target [role="option"]',
	},
	'Tags без выбора': {
		render: () => {
			const ctrl = new TTags()

			mount(TagsHarness, {
				tags: { ctrl, closable: true },
				items: [
					{ value: 'a', text: 'A', class: 'target' },
					{ value: 'b', text: 'B' },
				],
			})

			return ctrl
		},
		// У строк остановки нет — остановка набора — крестик первого тега
		target: '.target .so-tags-item__close',
	},
	'Tags.Item': {
		render: () => {
			const ctrl = new TTagsItem({ value: 'b', text: 'B' })

			mount(TagsHarness, {
				tags: { closable: true },
				items: [
					{ value: 'a', text: 'A' },
					{ ctrl, value: 'b', class: 'target' },
				],
			})

			return ctrl
		},
		// Без выбора строка — `listitem` без `tabindex`: остановка тега — крестик
		target: '.target .so-tags-item__close',
	},
	'Tags.Item с выбором': {
		render: () => {
			const ctrl = new TTagsItem({ value: 'b', text: 'B' })

			mount(TagsHarness, {
				tags: { mode: 'single', closable: true },
				items: [
					{ value: 'a', text: 'A' },
					{ ctrl, value: 'b', class: 'target' },
				],
			})

			return ctrl
		},
		// Строка-опция, хотя остановка набора у первого тега, а не крестик
		target: '.target [role="option"]',
	},
	'ListBox.Item': {
		render: () => {
			const ctrl = new TListBoxItem({ value: 'b', text: 'B' })

			mount(ListBoxHarness, {
				items: [
					{ value: 'a', text: 'A' },
					{ ctrl, value: 'b', class: 'target' },
				],
			})

			return ctrl
		},
		target: '.target [role="option"]',
	},
	// У пунктов меню фокус держит строка, а корень — обёртка вокруг неё
	'Menu.Item': {
		render: () => menuItem('item', new TMenuItem({ value: 'b', text: 'B' })),
		target: '.target [role="menuitem"]',
	},
	'Menu.CheckboxItem': {
		render: () => menuItem('checkbox', new TMenuCheckboxItem({ value: 'b', text: 'B' })),
		target: '.target [role="menuitemcheckbox"]',
	},
	'Menu.RadioItem': {
		render: () => menuItem('radio', new TMenuRadioItem({ value: 'b', text: 'B' })),
		target: '.target [role="menuitemradio"]',
	},
	'Menu.Submenu': {
		render: () => menuItem('submenu', new TMenuSubmenu({ value: 'b', text: 'B' })),
		target: '.target [role="menuitem"]',
	},
	'Menu.PopoverItem': {
		render: () => menuItem('popover-item', new TMenuPopoverItem({ value: 'b', text: 'B' })),
		target: '.target [role="menuitem"]',
	},
}

/**
 * Пункт меню, открытого с первой отрисовки, — за пунктом `a`: фокус встаёт на
 * строку своего пункта, а не на первую строку меню.
 */
function menuItem<T extends { focused: boolean }>(focus: TMenuFocusKind, ctrl: T): T {
	mount(MenuHarness, { case: 'focus', focus, part: { ctrl, class: 'target' } })

	return ctrl
}

/** Табы данными: активный — второй, остановка Tab не совпадает с первым табом. */
const TABS = [
	{ value: 'a', text: 'A' },
	{ value: 'b', text: 'B', _: { active: true } },
]

describe.each(Object.entries(CASES))('%s', (_name, { render, target, before }) => {
	it('focused = true — фокус на узле компонента, false — снят', async () => {
		const ctrl = render()

		await nextFrame()

		// Разбор не вхолостую: своя остановка перед главной частью есть
		if (before) find(document, before, HTMLElement)

		ctrl.focused = true
		flushSync()

		expect(document.activeElement).toBe(find(document, target, HTMLElement))
		expect(ctrl.focused).toBe(true)

		ctrl.focused = false
		flushSync()

		expect(document.activeElement).toBe(document.body)
		expect(ctrl.focused).toBe(false)
	})
})

describe('Tabs · остановка по модели', () => {
	/**
	 * Активный таб сменился в том же такте, что и запись `focused`: Svelte
	 * перерисует `tabindex` на своём такте, а остановку правило берёт у модели,
	 * — фокус встаёт на новый таб, а не на прежнюю остановку.
	 */
	it('смена активного и focused = true в одном такте — фокус на новом табе', async () => {
		const ctrl = new TTabs()
		const engine = createEngineTabs({
			items: [
				{ value: 'a', text: 'A', _: { active: true } },
				{ value: 'b', text: 'B' },
			],
		})

		mount(Tabs, { ctrl, engine })
		await nextFrame()

		const b = engine.extensions.batch.items.find((item) => item.value === 'b')
		const stop = () => find(document, '[role="tab"][tabindex="0"]', HTMLElement)

		if (!b) throw new Error('таба b нет')

		engine.extensions.activation.activate(b)

		// Такт тот же: остановка в разметке ещё у прежнего активного
		expect(stop().textContent?.trim()).toBe('A')

		ctrl.focused = true

		expect(document.activeElement?.textContent?.trim()).toBe('B')
		expect(document.activeElement?.getAttribute('role')).toBe('tab')
	})

	/**
	 * Таб добавили в движок и сделали активным в том же такте, что и запись
	 * `focused`: Svelte нарисует таб на своём такте, а остановка в модели —
	 * уже он, и корень Tabs фокус не держит. Запись ждёт узла: таб входит в
	 * коллекцию при сборке, его узел объявляют кадром позже — и фокус встаёт
	 * на него.
	 */
	it('новый таб и focused = true в одном такте — после перерисовки фокус на нём', async () => {
		const ctrl = new TTabs()
		const engine = createEngineTabs({ items: [{ value: 'a', text: 'A', _: { active: true } }] })

		mount(Tabs, { ctrl, engine })
		await nextFrame()

		engine.extensions.activation.activate(
			engine.extensions.plain.push({ value: 'c', text: 'C' }),
		)
		ctrl.focused = true

		// Такт тот же: таба в разметке нет, фокуса — тоже, а запись не откатилась
		expect(document.querySelectorAll('[role="tab"]')).toHaveLength(1)
		expect(document.activeElement).toBe(document.body)
		expect(ctrl.focused).toBe(true)

		flushSync()
		await nextFrame()

		expect(document.activeElement?.textContent?.trim()).toBe('C')
		expect(document.activeElement?.getAttribute('role')).toBe('tab')
		expect(ctrl.focused).toBe(true)
	})
})

describe('Calendar · остановка по модели', () => {
	const stop = () => find(document, '.so-calendar-item[tabindex="0"]', HTMLElement)
	const titleText = () => find(document, '.so-calendar__title-text', HTMLElement)

	/**
	 * Фокус коллекции ушёл в месяц второй сетки в том же такте, что и запись
	 * `focused`: Svelte перенесёт `tabindex` на своём такте, а остановку правило
	 * берёт у модели (`focusedDate`), — фокус встаёт на день того месяца, а не
	 * на прежнюю остановку в первой сетке.
	 */
	it('фокус коллекции в другом месяце и focused = true в одном такте — фокус на его дне', async () => {
		const ctrl = new TCalendar({ months: ['2026-01-01', '2026-02-01'] })
		const engine = createEngineCalendar()

		mount(Calendar, { ctrl, engine })
		await nextFrame()

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
	 * находит, а корень календаря фокус не держит. Запись ждёт узла: Svelte
	 * нарисует дни нового месяца на своём такте, их узлы объявят кадром позже —
	 * и фокус встанет на день `focusedDate`.
	 */
	it('одна сетка: showNext() и focused = true в одном такте — после перерисовки фокус на дне нового месяца', async () => {
		const ctrl = new TCalendar({ months: ['2026-01-01'] })
		const engine = createEngineCalendar()

		mount(Calendar, { ctrl, engine })
		await nextFrame()

		const { focus, view } = engine.extensions

		view.showNext()
		ctrl.focused = true

		const date = focus.focusedDate

		// Такт тот же: фокус коллекции в феврале, а разметка ещё январская
		expect(date.startsWith('2026-02-')).toBe(true)
		expect(titleText().textContent?.trim()).not.toBe(view.grids[0]?.title)
		expect(document.activeElement).toBe(document.body)
		expect(ctrl.focused).toBe(true)

		flushSync()
		await nextFrame()

		const day = document.activeElement

		expect(titleText().textContent?.trim()).toBe(view.grids[0]?.title)
		expect(day).toBe(stop())
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

		mount(Calendar, { ctrl, engine })
		await nextFrame()

		const picker = engine.extensions.picker.pickers[0]

		if (!picker) throw new Error('панели выбора нет')

		picker.popover.open = true
		flushSync()
		await nextFrame()

		// Фокус увели из календаря, а панель открыта
		ctrl.focused = false

		expect(picker.popover.open).toBe(true)

		ctrl.focused = true

		expect(document.activeElement).toBe(
			find(document, '.so-calendar__picker-list [role="listbox"]', HTMLElement),
		)
		expect(ctrl.focused).toBe(true)
	})
})

describe('RadioGroup · отметка по модели', () => {
	/**
	 * Значение сменилось в том же такте, что и запись `focused`: Svelte
	 * перепишет `checked` полей на своём такте, а отмеченное радио правило берёт
	 * у модели, — фокус встаёт на новое радио, а не на прежнее.
	 */
	it('смена значения и focused = true в одном такте — фокус на новом радио', async () => {
		const ctrl = new TRadioGroup({ value: 'a' })

		mount(RadioGroupHarness, {
			group: { ctrl },
			items: [{ value: 'a' }, { value: 'b', class: 'target' }],
		})
		await nextFrame()

		const target = () => find(document, '.target input', HTMLInputElement)

		ctrl.value = 'b'

		// Такт тот же: отмечено в разметке ещё прежнее
		expect(target().checked).toBe(false)

		ctrl.focused = true

		expect(document.activeElement).toBe(target())
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

		mount(Scroller, { ctrl, children: markup('<span>A</span>') })
		await nextFrame()

		ctrl.notifyViewport({ canPrev: false, canNext: true, hasTabStops: false })
		flushSync()

		ctrl.focused = true

		expect(document.activeElement).toBe(find(document, '.so-scroller__viewport', HTMLElement))
		expect(ctrl.focused).toBe(true)
	})
})

describe('Pagination · текущая по модели', () => {
	/**
	 * Значение сменилось в том же такте, что и запись `focused`: Svelte
	 * перепишет `aria-current` на своём такте, а текущую правило берёт по ключу
	 * значения, — фокус встаёт на новую текущую страницу, а не на прежнюю.
	 */
	it('смена значения и focused = true в одном такте — фокус на новой текущей', async () => {
		const ctrl = new TPagination({ total: 50, value: 2 })

		mount(Pagination, { ctrl })
		await nextFrame()

		ctrl.value = 3

		// Такт тот же: текущая в разметке ещё прежняя
		expect(find(document, '[aria-current="page"]', HTMLElement).textContent?.trim()).toBe('2')

		ctrl.focused = true

		expect(document.activeElement?.textContent?.trim()).toBe('3')
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

		mount(SelectHarness, {
			select: { ctrl: select },
			items: [
				{ value: 'a', text: 'A' },
				{ ctrl: item, value: 'b' },
			],
		})
		await nextFrame()

		select.focused = true
		flushSync()

		const field = find(document, '.so-select__field input', HTMLElement)

		expect(document.activeElement).toBe(field)

		item.focused = true
		flushSync()

		expect(document.activeElement).toBe(field)
	})
})
