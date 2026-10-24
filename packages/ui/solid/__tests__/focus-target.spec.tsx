/**
 * Запись `focused = true` ставит фокус туда, где он у компонента живёт.
 *
 * Сценарии — те же, что у Vue (`focus-target.spec.ts`) и React
 * (`focus-target.spec.tsx`), по компонентам адаптера. У поля корень — коробка
 * вокруг `<input>`, у поля даты — коробка вокруг ряда частей, у DatePicker —
 * коробка вокруг полей и кнопок, у календаря — корень сеток без своей
 * остановки, у Select — рамка вокруг поля и тегов, у набора тегов —
 * ряд, у ползунка и оценки — дорожка вокруг полей ручек, у ListBox
 * — рамка вокруг узла списка, у Tabs — рамка со списком табов и панелями, у
 * группы радио и аккордеона — контейнер остановок, у пагинации — `nav` без
 * своей остановки, у ленты — ряд из кнопок и вьюпорта, у элемента коллекции и
 * пункта меню — обёртка вокруг строки; узел фокуса называет правило
 * дескриптора (`focusTarget` плагина действия).
 *
 * Своё у Solid — такт: смену состояния он применяет к DOM синхронно, и
 * разметка отстаёт от модели только внутри `batch`.
 */

import { describe, it, expect } from 'vitest'
import { batch, type JSX } from 'solid-js'
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
	Calendar,
	CheckBox,
	DateInput,
	DatePicker,
	Input,
	ListBox,
	Menu,
	NumberInput,
	Pagination,
	RadioGroup,
	Rating,
	Scroller,
	Select,
	Slider,
	Switch,
	Tabs,
	Tags,
	Textarea,
} from '@soldy-ui/solid'
import type { DescriptorSlots, MenuDescriptor } from '@soldy-ui/setup'
import { find, mount, nextFrame } from './mount'

type TMenuTriggerScope = DescriptorSlots<typeof MenuDescriptor>['trigger']

/**
 * Меню, открытое с первой отрисовки, с пунктом `a` перед пунктом теста: фокус
 * встаёт на строку своего пункта, а не на первую строку меню. Пункт теста
 * разметка зовёт в содержимом меню — в слое его лифта.
 */
const menu = (item: () => JSX.Element) => () => (
	<Menu open trigger={(scope: TMenuTriggerScope) => <button {...scope.triggerAria}>M</button>}>
		<Menu.Item value="a" text="A" />
		{item()}
	</Menu>
)

type TCase = {
	/**
	 * Разметка и инстанс, которому тест пишет `focused`. Тип инстанса — только
	 * свойство: карта событий у каждого контрола своя.
	 */
	render: () => { ctrl: { focused: boolean }; node: () => JSX.Element }
	/** Узел, который держит фокус компонента. */
	target: string
	/** Своя остановка Tab перед главной частью: фокус на неё уйти не должен. */
	before?: string
}

const CASES: Record<string, TCase> = {
	Input: {
		render: () => {
			const ctrl = new TInput()

			return { ctrl, node: () => <Input ctrl={ctrl} /> }
		},
		target: 'input',
	},
	'Input с кнопкой в leading': {
		render: () => {
			const ctrl = new TInput()

			return { ctrl, node: () => <Input ctrl={ctrl} leading={<button class="before" />} /> }
		},
		target: 'input',
		before: '.before',
	},
	NumberInput: {
		render: () => {
			const ctrl = new TNumberInput()

			return { ctrl, node: () => <NumberInput ctrl={ctrl} /> }
		},
		target: '.so-number-input__input',
	},
	'NumberInput с кнопкой в leading': {
		render: () => {
			const ctrl = new TNumberInput()

			return {
				ctrl,
				node: () => <NumberInput ctrl={ctrl} leading={<button class="before" />} />,
			}
		},
		target: '.so-number-input__input',
		before: '.before',
	},
	Textarea: {
		render: () => {
			const ctrl = new TTextarea()

			return { ctrl, node: () => <Textarea ctrl={ctrl} /> }
		},
		target: 'textarea',
	},
	CheckBox: {
		render: () => {
			const ctrl = new TCheckBox()

			return { ctrl, node: () => <CheckBox ctrl={ctrl} /> }
		},
		target: 'input',
	},
	Switch: {
		render: () => {
			const ctrl = new TSwitch()

			return { ctrl, node: () => <Switch ctrl={ctrl} /> }
		},
		target: 'input',
	},
	// Фокус держит поле ручки, а корень — ряд звёзд вокруг
	Rating: {
		render: () => {
			const ctrl = new TRating()

			return { ctrl, node: () => <Rating ctrl={ctrl} /> }
		},
		target: 'input',
	},
	// Фокус держат поля ручек, а корень — дорожка вокруг: поле первой ручки
	Slider: {
		render: () => {
			const ctrl = new TSlider({ value: [20, 80] })

			return { ctrl, node: () => <Slider ctrl={ctrl} /> }
		},
		// Первое поле по документу — поле первой ручки
		target: '.so-slider input',
	},
	// Корень — `nav` без своей остановки: фокус — на кнопке текущей страницы
	Pagination: {
		render: () => {
			const ctrl = new TPagination()

			return { ctrl, node: () => <Pagination ctrl={ctrl} total={50} value={3} /> }
		},
		target: '[aria-current="page"]',
		// Стрелка «назад» на третьей странице включена — остановка перед страницами
		before: '.so-pagination__prev',
	},
	'Scroller со своими остановками': {
		render: () => {
			const ctrl = new TScroller()

			return {
				ctrl,
				node: () => (
					<Scroller ctrl={ctrl}>
						<button class="target">A</button>
						<button>B</button>
					</Scroller>
				),
			}
		},
		target: '.target',
	},
	// Фокус держит `<input>` поля, а корень — рамка вокруг поля и тегов
	Select: {
		render: () => {
			const ctrl = new TSelect()

			return {
				ctrl,
				node: () => (
					<Select ctrl={ctrl}>
						<Select.Item value="a" text="A" />
					</Select>
				),
			}
		},
		target: '.so-select__field input',
	},
	'Select multiple с тегами': {
		render: () => {
			const ctrl = new TSelect()

			return {
				ctrl,
				node: () => (
					<Select ctrl={ctrl} mode="multiple" value={['a', 'b']}>
						<Select.Item value="a" text="A" />
						<Select.Item value="b" text="B" />
					</Select>
				),
			}
		},
		target: '.so-select__field input',
		// Крестик тега — нативная остановка перед полем
		before: '.so-tags-item__close',
	},
	'RadioGroup.Item': {
		render: () => {
			const ctrl = new TRadioGroupItem({ value: 'b' })

			return {
				ctrl,
				node: () => (
					<RadioGroup>
						<RadioGroup.Item value="a" />
						<RadioGroup.Item ctrl={ctrl} class="target" />
					</RadioGroup>
				),
			}
		},
		target: '.target input',
	},
	ListBox: {
		render: () => {
			const ctrl = new TListBox()

			return {
				ctrl,
				node: () => (
					<ListBox ctrl={ctrl}>
						<ListBox.Item value="a" text="A" />
					</ListBox>
				),
			}
		},
		target: '[role="listbox"]',
	},
	'ListBox с полем в header': {
		render: () => {
			const ctrl = new TListBox()

			return {
				ctrl,
				node: () => (
					<ListBox ctrl={ctrl} header={<input class="before" />}>
						<ListBox.Item value="a" text="A" />
					</ListBox>
				),
			}
		},
		target: '[role="listbox"]',
		before: '.before',
	},
	Tabs: {
		render: () => {
			const ctrl = new TTabs()

			return {
				ctrl,
				node: () => (
					<Tabs ctrl={ctrl}>
						<Tabs.Item value="a" text="A" />
						<Tabs.Item value="b" text="B" active />
					</Tabs>
				),
			}
		},
		target: '[role="tab"][aria-selected="true"]',
	},
	'Tabs с кнопкой в leading': {
		render: () => {
			const ctrl = new TTabs()

			return {
				ctrl,
				node: () => (
					<Tabs ctrl={ctrl} leading={<button class="before" />}>
						<Tabs.Item value="a" text="A" />
						<Tabs.Item value="b" text="B" active />
					</Tabs>
				),
			}
		},
		target: '[role="tab"][aria-selected="true"]',
		before: '.before',
	},
	// Фокус держат части, а корень — коробка вокруг ряда: первая часть
	DateInput: {
		render: () => {
			const ctrl = new TDateInput()

			return { ctrl, node: () => <DateInput ctrl={ctrl} /> }
		},
		target: '.so-date-input__segment',
	},
	'DateInput с кнопкой в leading': {
		render: () => {
			const ctrl = new TDateInput()

			return {
				ctrl,
				node: () => (
					<DateInput ctrl={ctrl} leading={<button class="before">Сегодня</button>} />
				),
			}
		},
		target: '.so-date-input__segment',
		before: '.before',
	},
	// Корень — коробка вокруг полей и кнопок: первая часть поля, у диапазона — поля начала
	'DatePicker, одна дата': {
		render: () => {
			const ctrl = new TDatePicker()

			return { ctrl, node: () => <DatePicker ctrl={ctrl} /> }
		},
		target: '.so-date-picker__field .so-date-input__segment',
	},
	'DatePicker, диапазон': {
		render: () => {
			const ctrl = new TDatePicker({ mode: 'range' })

			return { ctrl, node: () => <DatePicker ctrl={ctrl} /> }
		},
		target: '.so-date-picker__start .so-date-input__segment',
	},
	// Остановка сетки — день с фокусом коллекции, а корень календаря фокус не держит
	Calendar: {
		render: () => {
			const ctrl = new TCalendar()

			return { ctrl, node: () => <Calendar ctrl={ctrl} /> }
		},
		target: '.so-calendar-item[tabindex="0"]',
		// Заголовок месяца и кнопки листания — остановки перед сеткой
		before: '.so-calendar__title',
	},
	'RadioGroup с отметкой': {
		render: () => {
			const ctrl = new TRadioGroup({ value: 'b' })

			return {
				ctrl,
				node: () => (
					<RadioGroup ctrl={ctrl}>
						<RadioGroup.Item value="a" />
						<RadioGroup.Item value="b" class="target" />
					</RadioGroup>
				),
			}
		},
		target: '.target input',
	},
	'RadioGroup без отметки, первое выключено': {
		render: () => {
			const ctrl = new TRadioGroup()

			return {
				ctrl,
				node: () => (
					<RadioGroup ctrl={ctrl}>
						<RadioGroup.Item value="a" disabled />
						<RadioGroup.Item value="b" class="target" />
					</RadioGroup>
				),
			}
		},
		target: '.target input',
	},
	Accordion: {
		render: () => {
			const ctrl = new TAccordion()

			return {
				ctrl,
				node: () => (
					<Accordion ctrl={ctrl}>
						<Accordion.Item value="a" text="A" class="target" />
						<Accordion.Item value="b" text="B" />
					</Accordion>
				),
			}
		},
		target: '.target .so-accordion-item__header',
	},
	'Accordion, первая секция выключена': {
		render: () => {
			const ctrl = new TAccordion()

			return {
				ctrl,
				node: () => (
					<Accordion ctrl={ctrl}>
						<Accordion.Item value="a" text="A" disabled />
						<Accordion.Item value="b" text="B" class="target" />
					</Accordion>
				),
			}
		},
		target: '.target .so-accordion-item__header',
	},
	'Tags с выбором': {
		render: () => {
			const ctrl = new TTags()

			return {
				ctrl,
				node: () => (
					<Tags ctrl={ctrl} mode="single" closable>
						<Tags.Item value="a" text="A" />
						<Tags.Item value="b" text="B" selected class="target" />
					</Tags>
				),
			}
		},
		// Остановка — выбранный тег, а не крестик первого и не первая строка
		target: '.target [role="option"]',
	},
	'Tags без выбора': {
		render: () => {
			const ctrl = new TTags()

			return {
				ctrl,
				node: () => (
					<Tags ctrl={ctrl} closable>
						<Tags.Item value="a" text="A" class="target" />
						<Tags.Item value="b" text="B" />
					</Tags>
				),
			}
		},
		// У строк остановки нет — остановка набора — крестик первого тега
		target: '.target .so-tags-item__close',
	},
	'Tags.Item': {
		render: () => {
			const ctrl = new TTagsItem({ value: 'b', text: 'B' })

			return {
				ctrl,
				node: () => (
					<Tags closable>
						<Tags.Item value="a" text="A" />
						<Tags.Item ctrl={ctrl} class="target" />
					</Tags>
				),
			}
		},
		// Без выбора строка — `listitem` без `tabindex`: остановка тега — крестик
		target: '.target .so-tags-item__close',
	},
	'Tags.Item с выбором': {
		render: () => {
			const ctrl = new TTagsItem({ value: 'b', text: 'B' })

			return {
				ctrl,
				node: () => (
					<Tags mode="single" closable>
						<Tags.Item value="a" text="A" />
						<Tags.Item ctrl={ctrl} class="target" />
					</Tags>
				),
			}
		},
		// Строка-опция, хотя остановка набора у первого тега, а не крестик
		target: '.target [role="option"]',
	},
	'Tabs.Item': {
		render: () => {
			const ctrl = new TTabsItem({ value: 'b', text: 'B' })

			return {
				ctrl,
				node: () => (
					<Tabs>
						<Tabs.Item value="a" text="A" active />
						<Tabs.Item ctrl={ctrl} class="target" />
					</Tabs>
				),
			}
		},
		target: '.target [role="tab"]',
	},
	'Accordion.Item': {
		render: () => {
			const ctrl = new TAccordionItem({ value: 'b', text: 'B' })

			return {
				ctrl,
				node: () => (
					<Accordion>
						<Accordion.Item value="a" text="A" />
						<Accordion.Item ctrl={ctrl} class="target" />
					</Accordion>
				),
			}
		},
		target: '.target .so-accordion-item__header',
	},
	'ListBox.Item': {
		render: () => {
			const ctrl = new TListBoxItem({ value: 'b', text: 'B' })

			return {
				ctrl,
				node: () => (
					<ListBox>
						<ListBox.Item value="a" text="A" />
						<ListBox.Item ctrl={ctrl} class="target" />
					</ListBox>
				),
			}
		},
		target: '.target [role="option"]',
	},
	// У пунктов меню фокус держит строка, а корень — обёртка вокруг неё
	'Menu.Item': {
		render: () => {
			const ctrl = new TMenuItem({ value: 'b', text: 'B' })

			return { ctrl, node: menu(() => <Menu.Item ctrl={ctrl} class="target" />) }
		},
		target: '.target [role="menuitem"]',
	},
	'Menu.CheckboxItem': {
		render: () => {
			const ctrl = new TMenuCheckboxItem({ value: 'b', text: 'B' })

			return { ctrl, node: menu(() => <Menu.CheckboxItem ctrl={ctrl} class="target" />) }
		},
		target: '.target [role="menuitemcheckbox"]',
	},
	'Menu.RadioItem': {
		render: () => {
			const ctrl = new TMenuRadioItem({ value: 'b', text: 'B' })

			return {
				ctrl,
				node: menu(() => (
					<Menu.RadioGroup label="Вид">
						<Menu.RadioItem ctrl={ctrl} class="target" />
					</Menu.RadioGroup>
				)),
			}
		},
		target: '.target [role="menuitemradio"]',
	},
	'Menu.Submenu': {
		render: () => {
			const ctrl = new TMenuSubmenu({ value: 'b', text: 'B' })

			return {
				ctrl,
				node: menu(() => (
					<Menu.Submenu ctrl={ctrl} class="target">
						<Menu.Item value="x" text="X" />
					</Menu.Submenu>
				)),
			}
		},
		target: '.target [role="menuitem"]',
	},
	'Menu.PopoverItem': {
		render: () => {
			const ctrl = new TMenuPopoverItem({ value: 'b', text: 'B' })

			return {
				ctrl,
				node: menu(() => (
					<Menu.PopoverItem ctrl={ctrl} class="target">
						<p>Панель</p>
					</Menu.PopoverItem>
				)),
			}
		},
		target: '.target [role="menuitem"]',
	},
}

describe.each(Object.entries(CASES))('%s', (_name, { render, target, before }) => {
	it('focused = true — фокус на узле компонента, false — снят', async () => {
		const { ctrl, node } = render()

		mount(node)
		await nextFrame()

		// Разбор не вхолостую: своя остановка перед главной частью есть
		if (before) find(document, before, HTMLElement)

		ctrl.focused = true

		expect(document.activeElement).toBe(find(document, target, HTMLElement))
		expect(ctrl.focused).toBe(true)

		ctrl.focused = false

		expect(document.activeElement).toBe(document.body)
		expect(ctrl.focused).toBe(false)
	})
})

describe('Tabs · остановка по модели', () => {
	/**
	 * Активный таб сменился в том же такте, что и запись `focused`: внутри
	 * `batch` Solid перерисует `tabindex` только на выходе, а остановку правило
	 * берёт у модели, — фокус встаёт на новый таб, а не на прежнюю остановку.
	 */
	it('смена активного и focused = true в одном такте — фокус на новом табе', async () => {
		const ctrl = new TTabs()
		const engine = createEngineTabs({
			items: [
				{ value: 'a', text: 'A', _: { active: true } },
				{ value: 'b', text: 'B' },
			],
		})

		mount(() => <Tabs ctrl={ctrl} engine={engine} />)
		await nextFrame()

		const b = engine.extensions.batch.items.find((item) => item.value === 'b')
		const stop = () => find(document, '[role="tab"][tabindex="0"]', HTMLElement)

		if (!b) throw new Error('таба b нет')

		batch(() => {
			engine.extensions.activation.activate(b)

			// Такт тот же: остановка в разметке ещё у прежнего активного
			expect(stop().textContent?.trim()).toBe('A')

			ctrl.focused = true
		})

		expect(document.activeElement?.textContent?.trim()).toBe('B')
		expect(document.activeElement?.getAttribute('role')).toBe('tab')
	})

	/**
	 * Таб добавили в движок и сделали активным в том же такте, что и запись
	 * `focused`: внутри `batch` Solid нарисует таб только на выходе, а
	 * остановка в модели — уже он, и корень Tabs фокус не держит. Запись ждёт
	 * узла: таб входит в коллекцию при сборке, его узел объявляют кадром позже
	 * — и фокус встаёт на него.
	 */
	it('новый таб и focused = true в одном такте — после перерисовки фокус на нём', async () => {
		const ctrl = new TTabs()
		const engine = createEngineTabs({ items: [{ value: 'a', text: 'A', _: { active: true } }] })

		mount(() => <Tabs ctrl={ctrl} engine={engine} />)
		await nextFrame()

		batch(() => {
			engine.extensions.activation.activate(
				engine.extensions.plain.push({ value: 'c', text: 'C' }),
			)
			ctrl.focused = true

			// Такт тот же: таба в разметке нет, фокуса — тоже, а запись не откатилась
			expect(document.querySelectorAll('[role="tab"]')).toHaveLength(1)
			expect(document.activeElement).toBe(document.body)
			expect(ctrl.focused).toBe(true)
		})

		await nextFrame()

		expect(document.activeElement?.textContent?.trim()).toBe('C')
		expect(document.activeElement?.getAttribute('role')).toBe('tab')
		expect(ctrl.focused).toBe(true)
	})
})

describe('Calendar · остановка по модели', () => {
	/**
	 * Фокус коллекции ушёл в месяц второй сетки в том же такте, что и запись
	 * `focused`: внутри `batch` Solid перенесёт `tabindex` только на выходе, а
	 * остановку правило берёт у модели (`focusedDate`), — фокус встаёт на день
	 * того месяца, а не на прежнюю остановку в первой сетке. Сеток две: день
	 * месяца, который в такте листания только показывается, в разметке ещё не
	 * нарисован.
	 */
	it('фокус коллекции в другом месяце и focused = true в одном такте — фокус на его дне', async () => {
		const ctrl = new TCalendar({ months: ['2026-01-01', '2026-02-01'] })
		const engine = createEngineCalendar()

		mount(() => <Calendar ctrl={ctrl} engine={engine} />)
		await nextFrame()

		const stop = () => find(document, '.so-calendar-item[tabindex="0"]', HTMLElement)
		const before = stop()

		batch(() => {
			engine.extensions.focus.focusDate('2026-02-10')

			// Такт тот же: остановка в разметке ещё в январе
			expect(stop()).toBe(before)
			expect(engine.extensions.focus.focusedDate).toBe('2026-02-10')

			ctrl.focused = true
		})

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
	 * находит, а корень календаря фокус не держит. Запись ждёт узла: Solid
	 * нарисует дни нового месяца на выходе из `batch`, их узлы объявят кадром
	 * позже — и фокус встанет на день `focusedDate`.
	 */
	it('одна сетка: showNext() и focused = true в одном такте — после перерисовки фокус на дне нового месяца', async () => {
		const ctrl = new TCalendar({ months: ['2026-01-01'] })
		const engine = createEngineCalendar()

		mount(() => <Calendar ctrl={ctrl} engine={engine} />)
		await nextFrame()

		const { focus, view } = engine.extensions
		const title = () => find(document, '.so-calendar__title-text', HTMLElement)

		batch(() => {
			view.showNext()
			ctrl.focused = true

			// Такт тот же: фокус коллекции в феврале, а разметка ещё январская
			expect(focus.focusedDate.startsWith('2026-02-')).toBe(true)
			expect(title().textContent?.trim()).not.toBe(view.grids[0]?.title)
			expect(document.activeElement).toBe(document.body)
			expect(ctrl.focused).toBe(true)
		})

		await nextFrame()

		const date = focus.focusedDate
		const day = document.activeElement

		expect(title().textContent?.trim()).toBe(view.grids[0]?.title)
		expect(day).toBe(find(document, '.so-calendar-item[tabindex="0"]', HTMLElement))
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

		mount(() => <Calendar ctrl={ctrl} engine={engine} />)
		await nextFrame()

		const picker = engine.extensions.picker.pickers[0]

		if (!picker) throw new Error('панели выбора нет')

		picker.popover.open = true
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
	 * Значение сменилось в том же такте, что и запись `focused`: внутри `batch`
	 * Solid перепишет `checked` полей только на выходе, а отмеченное радио
	 * правило берёт у модели, — фокус встаёт на новое радио, а не на прежнее.
	 */
	it('смена значения и focused = true в одном такте — фокус на новом радио', async () => {
		const ctrl = new TRadioGroup({ value: 'a' })

		mount(() => (
			<RadioGroup ctrl={ctrl}>
				<RadioGroup.Item value="a" />
				<RadioGroup.Item value="b" class="target" />
			</RadioGroup>
		))
		await nextFrame()

		const target = () => find(document, '.target input', HTMLInputElement)

		batch(() => {
			ctrl.value = 'b'

			// Такт тот же: отмечено в разметке ещё прежнее
			expect(target().checked).toBe(false)

			ctrl.focused = true
		})

		expect(document.activeElement).toBe(target())
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

		mount(() => (
			<Select ctrl={select}>
				<Select.Item value="a" text="A" />
				<Select.Item ctrl={item} />
			</Select>
		))
		await nextFrame()

		select.focused = true

		const field = find(document, '.so-select__field input', HTMLElement)

		expect(document.activeElement).toBe(field)

		item.focused = true

		expect(document.activeElement).toBe(field)
	})
})

describe('Scroller · вьюпорт — остановка', () => {
	/**
	 * Своих остановок в ленте нет, а листать есть куда: остановка — сам
	 * вьюпорт. Замер в jsdom нулевой, поэтому факт приносит инстанс — как
	 * `scroller.spec.tsx`.
	 */
	it('своих остановок нет — фокус на вьюпорте, а не на кнопке «вперёд»', async () => {
		const ctrl = new TScroller()

		mount(() => (
			<Scroller ctrl={ctrl}>
				<span>A</span>
			</Scroller>
		))
		await nextFrame()

		ctrl.notifyViewport({ canPrev: false, canNext: true, hasTabStops: false })
		ctrl.focused = true

		expect(document.activeElement).toBe(find(document, '.so-scroller__viewport', HTMLElement))
		expect(ctrl.focused).toBe(true)
	})
})
