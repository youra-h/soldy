/**
 * Запись `focused = true` ставит фокус туда, где он у компонента живёт.
 *
 * Сценарии — те же, что у Vue (`focus-target.spec.ts`), по компонентам
 * адаптера. У поля корень — коробка вокруг `<input>`, у Select — рамка вокруг
 * поля и тегов, у ListBox — рамка вокруг узла списка, у Tabs — рамка со
 * списком табов и панелями, у набора тегов — ряд, у группы радио и
 * аккордеона — контейнер остановок, у элемента коллекции — обёртка вокруг
 * строки; узел фокуса называет правило дескриптора (`focusTarget` плагина
 * действия).
 *
 * Своё у React — `act`: запись `focused` и фокус меняют состояние компонентов
 * (у Tabs — ещё и таба), и обновление мимо `act` роняет тест сторожем консоли.
 */

import { describe, it, expect } from 'vitest'
import { act, type ReactElement } from 'react'
import {
	TAccordion,
	TAccordionItem,
	TCheckBox,
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
	createEngineTabs,
} from '@soldy-ui/core'
import {
	Accordion,
	Button,
	CheckBox,
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
} from '@soldy-ui/react'
import type { DescriptorSlots, MenuDescriptor } from '@soldy-ui/setup'
import { find, mount, nextFrame } from './mount'

type TMenuTriggerScope = DescriptorSlots<typeof MenuDescriptor>['trigger']

/**
 * Меню, открытое с первой отрисовки, с пунктом `a` перед пунктом теста: фокус
 * встаёт на строку своего пункта, а не на первую строку меню.
 */
const menu = (item: ReactElement) => (
	<Menu
		open
		trigger={({ triggerAria }: TMenuTriggerScope) => <Button text="M" {...triggerAria} />}
	>
		<Menu.Item value="a" text="A" />
		{item}
	</Menu>
)

type TCase = {
	/**
	 * Разметка и инстанс, которому тест пишет `focused`. Тип инстанса — только
	 * свойство: карта событий у каждого контрола своя.
	 */
	render: () => { ctrl: { focused: boolean }; node: ReactElement }
	/** Узел, который держит фокус компонента. */
	target: string
	/** Своя остановка Tab перед главной частью: фокус на неё уйти не должен. */
	before?: string
}

const CASES: Record<string, TCase> = {
	Input: {
		render: () => {
			const ctrl = new TInput()

			return { ctrl, node: <Input ctrl={ctrl} /> }
		},
		target: 'input',
	},
	'Input с кнопкой в leading': {
		render: () => {
			const ctrl = new TInput()

			return { ctrl, node: <Input ctrl={ctrl} leading={<button className="before" />} /> }
		},
		target: 'input',
		before: '.before',
	},
	NumberInput: {
		render: () => {
			const ctrl = new TNumberInput()

			return { ctrl, node: <NumberInput ctrl={ctrl} /> }
		},
		target: '.so-number-input__input',
	},
	'NumberInput с кнопкой в leading': {
		render: () => {
			const ctrl = new TNumberInput()

			return {
				ctrl,
				node: <NumberInput ctrl={ctrl} leading={<button className="before" />} />,
			}
		},
		target: '.so-number-input__input',
		before: '.before',
	},
	Textarea: {
		render: () => {
			const ctrl = new TTextarea()

			return { ctrl, node: <Textarea ctrl={ctrl} /> }
		},
		target: 'textarea',
	},
	CheckBox: {
		render: () => {
			const ctrl = new TCheckBox()

			return { ctrl, node: <CheckBox ctrl={ctrl} /> }
		},
		target: 'input',
	},
	Switch: {
		render: () => {
			const ctrl = new TSwitch()

			return { ctrl, node: <Switch ctrl={ctrl} /> }
		},
		target: 'input',
	},
	Rating: {
		render: () => {
			const ctrl = new TRating()

			return { ctrl, node: <Rating ctrl={ctrl} /> }
		},
		target: 'input',
	},
	Slider: {
		render: () => {
			const ctrl = new TSlider()

			return { ctrl, node: <Slider ctrl={ctrl} /> }
		},
		target: 'input',
	},
	Pagination: {
		render: () => {
			const ctrl = new TPagination()

			return { ctrl, node: <Pagination ctrl={ctrl} total={50} value={3} /> }
		},
		target: '[aria-current="page"]',
		// Стрелка «назад» на третьей странице включена — остановка перед страницами
		before: '.so-pagination__prev:not([disabled])',
	},
	'Scroller со своими остановками': {
		render: () => {
			const ctrl = new TScroller()

			return {
				ctrl,
				node: (
					<Scroller ctrl={ctrl}>
						<button className="target">A</button>
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
				node: (
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
				node: (
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
				node: (
					<RadioGroup>
						<RadioGroup.Item value="a" />
						<RadioGroup.Item ctrl={ctrl} className="target" />
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
				node: (
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
				node: (
					<ListBox ctrl={ctrl} header={<input className="before" />}>
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
				node: (
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
				node: (
					<Tabs ctrl={ctrl} leading={<button className="before" />}>
						<Tabs.Item value="a" text="A" />
						<Tabs.Item value="b" text="B" active />
					</Tabs>
				),
			}
		},
		target: '[role="tab"][aria-selected="true"]',
		before: '.before',
	},
	'RadioGroup с отметкой': {
		render: () => {
			const ctrl = new TRadioGroup({ value: 'b' })

			return {
				ctrl,
				node: (
					<RadioGroup ctrl={ctrl}>
						<RadioGroup.Item value="a" />
						<RadioGroup.Item value="b" className="target" />
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
				node: (
					<RadioGroup ctrl={ctrl}>
						<RadioGroup.Item value="a" disabled />
						<RadioGroup.Item value="b" className="target" />
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
				node: (
					<Accordion ctrl={ctrl}>
						<Accordion.Item value="a" text="A" className="target" />
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
				node: (
					<Accordion ctrl={ctrl}>
						<Accordion.Item value="a" text="A" disabled />
						<Accordion.Item value="b" text="B" className="target" />
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
				node: (
					<Tags ctrl={ctrl} mode="single" closable>
						<Tags.Item value="a" text="A" />
						<Tags.Item value="b" text="B" selected className="target" />
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
				node: (
					<Tags ctrl={ctrl} closable>
						<Tags.Item value="a" text="A" className="target" />
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
				node: (
					<Tags closable>
						<Tags.Item value="a" text="A" />
						<Tags.Item ctrl={ctrl} className="target" />
					</Tags>
				),
			}
		},
		target: '.target [role="listitem"]',
	},
	'Tabs.Item': {
		render: () => {
			const ctrl = new TTabsItem({ value: 'b', text: 'B' })

			return {
				ctrl,
				node: (
					<Tabs>
						<Tabs.Item value="a" text="A" active />
						<Tabs.Item ctrl={ctrl} className="target" />
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
				node: (
					<Accordion>
						<Accordion.Item value="a" text="A" />
						<Accordion.Item ctrl={ctrl} className="target" />
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
				node: (
					<ListBox>
						<ListBox.Item value="a" text="A" />
						<ListBox.Item ctrl={ctrl} className="target" />
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

			return { ctrl, node: menu(<Menu.Item ctrl={ctrl} className="target" />) }
		},
		target: '.target [role="menuitem"]',
	},
	'Menu.CheckboxItem': {
		render: () => {
			const ctrl = new TMenuCheckboxItem({ value: 'b', text: 'B' })

			return { ctrl, node: menu(<Menu.CheckboxItem ctrl={ctrl} className="target" />) }
		},
		target: '.target [role="menuitemcheckbox"]',
	},
	'Menu.RadioItem': {
		render: () => {
			const ctrl = new TMenuRadioItem({ value: 'b', text: 'B' })

			return {
				ctrl,
				node: menu(
					<Menu.RadioGroup label="Вид">
						<Menu.RadioItem ctrl={ctrl} className="target" />
					</Menu.RadioGroup>,
				),
			}
		},
		target: '.target [role="menuitemradio"]',
	},
	'Menu.Submenu': {
		render: () => {
			const ctrl = new TMenuSubmenu({ value: 'b', text: 'B' })

			return {
				ctrl,
				node: menu(
					<Menu.Submenu ctrl={ctrl} className="target">
						<Menu.Item value="x" text="X" />
					</Menu.Submenu>,
				),
			}
		},
		target: '.target [role="menuitem"]',
	},
	'Menu.PopoverItem': {
		render: () => {
			const ctrl = new TMenuPopoverItem({ value: 'b', text: 'B' })

			return {
				ctrl,
				node: menu(
					<Menu.PopoverItem ctrl={ctrl} className="target">
						<p>Панель</p>
					</Menu.PopoverItem>,
				),
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

		act(() => {
			ctrl.focused = true
		})

		expect(document.activeElement).toBe(find(document, target, HTMLElement))
		expect(ctrl.focused).toBe(true)

		act(() => {
			ctrl.focused = false
		})

		expect(document.activeElement).toBe(document.body)
		expect(ctrl.focused).toBe(false)
	})
})

describe('Tabs · остановка по модели', () => {
	/**
	 * Активный таб сменился в том же такте, что и запись `focused`: React
	 * перерисует `tabindex` после `act`, а остановку правило берёт у модели, —
	 * фокус встаёт на новый таб, а не на прежнюю остановку.
	 */
	it('смена активного и focused = true в одном такте — фокус на новом табе', async () => {
		const ctrl = new TTabs()
		const engine = createEngineTabs({
			items: [
				{ value: 'a', text: 'A', _: { active: true } },
				{ value: 'b', text: 'B' },
			],
		})

		mount(<Tabs ctrl={ctrl} engine={engine} />)
		await nextFrame()

		const b = engine.extensions.batch.items.find((item) => item.value === 'b')
		const stop = () => find(document, '[role="tab"][tabindex="0"]', HTMLElement)

		if (!b) throw new Error('таба b нет')

		act(() => {
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
	 * `focused`: остановка в модели — он, а его узла в разметке нет, и корень
	 * Tabs фокус не держит. Запись ждёт узла. React рисует таб на выходе из
	 * `act`, а в коллекцию таб входит эффектом, когда его узел уже привязан, —
	 * фокус встаёт на самом входе, внутри `act`, а не кадром позже.
	 */
	it('новый таб и focused = true в одном такте — после перерисовки фокус на нём', async () => {
		const ctrl = new TTabs()
		const engine = createEngineTabs({ items: [{ value: 'a', text: 'A', _: { active: true } }] })

		mount(<Tabs ctrl={ctrl} engine={engine} />)
		await nextFrame()

		act(() => {
			engine.extensions.activation.activate(
				engine.extensions.plain.push({ value: 'c', text: 'C' }),
			)
			ctrl.focused = true

			// Такт тот же: таба в разметке нет, фокуса — тоже, а запись не откатилась
			expect(document.querySelectorAll('[role="tab"]')).toHaveLength(1)
			expect(document.activeElement).toBe(document.body)
			expect(ctrl.focused).toBe(true)
		})

		expect(document.activeElement?.textContent?.trim()).toBe('C')
		expect(document.activeElement?.getAttribute('role')).toBe('tab')
		expect(ctrl.focused).toBe(true)
	})
})

describe('RadioGroup · отметка по модели', () => {
	/**
	 * Значение сменилось в том же такте, что и запись `focused`: React
	 * перепишет `checked` полей после `act`, а отмеченное радио правило берёт у
	 * модели, — фокус встаёт на новое радио, а не на прежнее.
	 */
	it('смена значения и focused = true в одном такте — фокус на новом радио', async () => {
		const ctrl = new TRadioGroup({ value: 'a' })

		mount(
			<RadioGroup ctrl={ctrl}>
				<RadioGroup.Item value="a" />
				<RadioGroup.Item value="b" className="target" />
			</RadioGroup>,
		)
		await nextFrame()

		const target = () => find(document, '.target input', HTMLInputElement)

		act(() => {
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

		mount(
			<Select ctrl={select}>
				<Select.Item value="a" text="A" />
				<Select.Item ctrl={item} />
			</Select>,
		)
		await nextFrame()

		act(() => {
			select.focused = true
		})

		const field = find(document, '.so-select__field input', HTMLElement)

		expect(document.activeElement).toBe(field)

		act(() => {
			item.focused = true
		})

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

		mount(
			<Scroller ctrl={ctrl}>
				<span>A</span>
			</Scroller>,
		)
		await nextFrame()

		act(() => {
			ctrl.notifyViewport({ canPrev: false, canNext: true, hasTabStops: false })
		})

		act(() => {
			ctrl.focused = true
		})

		expect(document.activeElement).toBe(find(document, '.so-scroller__viewport', HTMLElement))
		expect(ctrl.focused).toBe(true)
	})
})

describe('Pagination · текущая по модели', () => {
	/**
	 * Значение сменилось в том же такте, что и запись `focused`: страницу окна
	 * React перерисует после `act`, а текущую правило берёт по ключу значения,
	 * — фокус встаёт на новую текущую, а не на прежнюю.
	 */
	it('смена значения и focused = true в одном такте — фокус на новой текущей', async () => {
		const ctrl = new TPagination({ total: 50, value: 2 })

		mount(<Pagination ctrl={ctrl} />)
		await nextFrame()

		act(() => {
			ctrl.value = 3

			// Такт тот же: текущая в разметке ещё прежняя
			expect(find(document, '[aria-current="page"]', HTMLElement).textContent).toBe('2')

			ctrl.focused = true
		})

		expect(document.activeElement?.textContent).toBe('3')
		expect(document.activeElement?.getAttribute('aria-current')).toBe('page')
	})
})
