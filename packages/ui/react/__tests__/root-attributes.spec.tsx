/**
 * Порядок атрибутов корня — один у всех компонентов (`toRootProps`).
 *
 * Наборы ядра (`attrs`, `aria`, `dataset`) ложатся первыми, атрибуты снаружи —
 * поверх них, как у Vue, где атрибуты снаружи падают на корень последними.
 * Раньше компоненты React разворачивали атрибуты потребителя первыми, и набор
 * ядра их перекрывал: `tabindex="-1"` строки ListBox проигрывал
 * `tabindex="0"`, который кнопка на `div` ставит себе сама, — строки списка
 * стали бы остановками Tab.
 *
 * `ref` адаптера — последним: в React 19 `ref` — обычный проп, и `ref`
 * потребителя из его атрибутов выбил бы привязку корня к `TElementPlugin` —
 * не было бы `element:ready`. Корень `ref` потребителя отдаёт сам ref
 * адаптера: у всех компонентов, у полей и элементов коллекций тоже — корень, а
 * не `<input>` и не строку, у таблицы — окно, её внешний узел.
 *
 * Элемент коллекции (`Tabs.Item`, `Accordion.Item`, `RadioGroup.Item`,
 * `Tags.Item`, `Select.Item`) делит атрибуты потребителя, как у Vue: класс и
 * стиль — корню, остальное — строке (у радио — полю), поверх её набора
 * `aria`. Корень остаётся за адаптером и у него. Пункт меню — любого вида —
 * делит их так же, как элемент коллекции: остальное — строке с ролью
 * `menuitem*`. ListBox и Tabs делят их так же: остальное — узлу списка с ролью
 * (`listbox`, `tablist`), поверх его `aria`. Select — как поле: остальное —
 * `<input>` его поля. Table — между окном и корнем `table` в нём: класс, стиль
 * и `ref` — окну, остальное — `table`. Поле даты, Calendar и DatePicker их
 * не делят: своего `<input>` под них нет, и всё уходит корню, как у Vue.
 */

import { describe, it, expect, vi } from 'vitest'
import {
	StrictMode,
	act,
	createRef,
	type ComponentType,
	type HTMLAttributes,
	type ReactNode,
	type Ref,
} from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import {
	TButton,
	TCheckBox,
	TInput,
	TNumberInput,
	TSelect,
	TSwitch,
	TTextarea,
	type TTableColumnSource,
} from '@soldy-ui/core'
import {
	Accordion,
	Button,
	Calendar,
	CheckBox,
	ComponentView,
	DateInput,
	DatePicker,
	Dialog,
	Drawer,
	Field,
	Frame,
	Icon,
	Input,
	Label,
	ListBox,
	Menu,
	NumberInput,
	Pagination,
	Popover,
	ProgressLinear,
	ProgressSpinner,
	RadioGroup,
	Rating,
	Scroller,
	Select,
	Skeleton,
	Slider,
	Switch,
	Table,
	Tabs,
	Tags,
	Textarea,
	Toasts,
	Tooltip,
	type AccordionItemProps,
	type AccordionProps,
	type ButtonProps,
	type CalendarProps,
	type ComponentViewProps,
	type DateInputProps,
	type DatePickerProps,
	type DialogProps,
	type DrawerProps,
	type FieldProps,
	type FrameProps,
	type IconProps,
	type LabelProps,
	type ListBoxItemProps,
	type ListBoxProps,
	type MenuCheckboxItemProps,
	type MenuItemProps,
	type MenuPopoverItemProps,
	type MenuProps,
	type MenuRadioItemProps,
	type MenuSubmenuProps,
	type PaginationProps,
	type PopoverProps,
	type ProgressLinearProps,
	type ProgressSpinnerProps,
	type RadioGroupItemProps,
	type RadioGroupProps,
	type RatingProps,
	type ScrollerProps,
	type SelectGroupProps,
	type SelectItemProps,
	type SkeletonProps,
	type SliderProps,
	type TableProps,
	type TabsContentProps,
	type TabsItemProps,
	type TabsProps,
	type TagsItemProps,
	type TagsProps,
	type ToastsProps,
	type TooltipProps,
	toControlAttrs,
	toRootForward,
	toRootLayout,
	toWrappedRootProps,
} from '@soldy-ui/react'
import { find, mount, nextFrame, track } from './mount'

/** Общие пропсы строки таблицы: направление и колбэк готовности есть у всех. */
type TProbeProps = ButtonProps &
	ComponentViewProps &
	FieldProps &
	FrameProps &
	IconProps &
	LabelProps &
	ProgressLinearProps &
	ProgressSpinnerProps &
	SkeletonProps &
	TabsProps &
	AccordionProps &
	RadioGroupProps &
	TabsContentProps &
	SliderProps &
	RatingProps &
	PaginationProps &
	ScrollerProps &
	PopoverProps &
	TooltipProps &
	DialogProps &
	DrawerProps &
	ToastsProps

/**
 * Menu — пробником: его пропсы в пересечение пропсов таблицы TypeScript уже не
 * вмещает (TS2590), а таблице от меню нужны только направление и `dir`.
 */
function MenuProbe({ direction, dir }: Pick<MenuProps, 'direction' | 'dir'>): ReactNode {
	return <Menu direction={direction} dir={dir} />
}

/** Tags — пробником, по той же причине, что Menu. */
function TagsProbe({ direction, dir }: Pick<TagsProps, 'direction' | 'dir'>): ReactNode {
	return <Tags direction={direction} dir={dir} />
}

/** Панель рисуется, пока активен её таб, — и только внутри набора. */
function TabsContentProbe(props: TabsContentProps): ReactNode {
	return (
		<Tabs content={<Tabs.Content value="a" {...props} />}>
			<Tabs.Item value="a" text="A" active />
		</Tabs>
	)
}

/**
 * Компонент, класс его корня и пропсы, без которых он не рисуется: у Icon
 * тега по умолчанию нет. Frame, окно, выезжающая панель и регион тостов уходят
 * телепортом в `body` — корень ищется по документу.
 */
const COMPONENTS: ReadonlyArray<
	readonly [string, ComponentType<TProbeProps>, string, Partial<TProbeProps>]
> = [
	['Button', Button, '.so-button', {}],
	['ComponentView', ComponentView, '.so-component-view', {}],
	['Field', Field, '.so-field', {}],
	['Frame', Frame, '.so-frame', {}],
	['Icon', Icon, '.so-icon', { tag: 'i' }],
	['Label', Label, '.so-label', {}],
	['ProgressLinear', ProgressLinear, '.so-progress-linear', {}],
	['ProgressSpinner', ProgressSpinner, '.so-progress-spinner', {}],
	['Skeleton', Skeleton, '.so-skeleton', {}],
	['Tabs.Content', TabsContentProbe, '.so-tabs__panel', {}],
	['Accordion', Accordion, '.so-accordion', {}],
	['RadioGroup', RadioGroup, '.so-radio-group', {}],
	['Slider', Slider, '.so-slider', {}],
	['Rating', Rating, '.so-rating', {}],
	['Pagination', Pagination, '.so-pagination', {}],
	['Scroller', Scroller, '.so-scroller', {}],
	['Popover', Popover, '.so-popover', {}],
	['Tooltip', Tooltip, '.so-tooltip', {}],
	['Menu', MenuProbe, '.so-menu', {}],
	['Dialog', Dialog, '.so-dialog', {}],
	['Drawer', Drawer, '.so-drawer', {}],
	['Toasts', Toasts, '.so-toasts', {}],
	['Tags', TagsProbe, '.so-tags', {}],
]

/** Общие пропсы поля даты, календаря и DatePicker. */
type TDateProbeProps = DateInputProps & CalendarProps & DatePickerProps

/**
 * Поле даты, Calendar и DatePicker и класс их корня — своей таблицей: в
 * пересечение пропсов таблицы компонентов TypeScript их уже не вмещает
 * (TS2590). Атрибуты потребителя они не делят: своего `<input>` под них нет, и
 * всё уходит корню, как у Vue.
 */
const DATES: ReadonlyArray<readonly [string, ComponentType<TDateProbeProps>, string]> = [
	['DateInput', DateInput, '.so-date-input'],
	['Calendar', Calendar, '.so-calendar'],
	['DatePicker', DatePicker, '.so-date-picker'],
]

/**
 * Атрибуты потребителя, которые таблица отдаёт элементу коллекции: `id` уходит
 * строке, класс и стиль — корню. Пересечение пропсов всех элементов
 * TypeScript уже не представляет (TS2590), а таблице нужны только они — их
 * принимает каждый элемент.
 */
type TItemProbeProps = Pick<HTMLAttributes<HTMLElement>, 'id' | 'className' | 'style'>

/** Таб — в наборе: `id` строке пишет коллекция. */
function TabsItemProbe(props: TabsItemProps): ReactNode {
	return (
		<Tabs>
			<Tabs.Item value="a" text="A" active {...props} />
		</Tabs>
	)
}

/** Секция — в аккордеоне: `id` заголовку пишет коллекция. */
function AccordionItemProbe(props: AccordionItemProps): ReactNode {
	return (
		<Accordion>
			<Accordion.Item value="a" text="A" {...props} />
		</Accordion>
	)
}

/** Радио — в группе; строки у него нет, атрибуты потребителя уходят полю. */
function RadioGroupItemProbe(props: RadioGroupItemProps): ReactNode {
	return (
		<RadioGroup>
			<RadioGroup.Item value="a" {...props} />
		</RadioGroup>
	)
}

/**
 * A menu item — inside a menu: the menu's collection writes the role,
 * `tabindex` and links to its row. The menus of these probes are open: items
 * mount from the panel's first opening on (`contentRendered`).
 */
function MenuItemProbe(props: MenuItemProps): ReactNode {
	return (
		<Menu open>
			<Menu.Item value="a" text="A" {...props} />
		</Menu>
	)
}

function MenuCheckboxItemProbe(props: MenuCheckboxItemProps): ReactNode {
	return (
		<Menu open>
			<Menu.CheckboxItem value="a" text="A" {...props} />
		</Menu>
	)
}

/** Переключатель — в группе переключателей, как его пишут. */
function MenuRadioItemProbe(props: MenuRadioItemProps): ReactNode {
	return (
		<Menu open>
			<Menu.RadioGroup value="a">
				<Menu.RadioItem value="a" text="A" {...props} />
			</Menu.RadioGroup>
		</Menu>
	)
}

/** Пункт с подменю — без своих пунктов: в документе один `.so-menu-item`. */
function MenuSubmenuProbe(props: MenuSubmenuProps): ReactNode {
	return (
		<Menu open>
			<Menu.Submenu value="share" text="Поделиться" {...props} />
		</Menu>
	)
}

function MenuPopoverItemProbe(props: MenuPopoverItemProps): ReactNode {
	return (
		<Menu open>
			<Menu.PopoverItem value="due" text="Срок" {...props} />
		</Menu>
	)
}

/** Тег — в наборе: роль и `tabindex` строке пишет коллекция. */
function TagsItemProbe(props: TagsItemProps): ReactNode {
	return (
		<Tags>
			<Tags.Item value="a" text="A" {...props} />
		</Tags>
	)
}

/**
 * Опция — в Select: `id` строке пишет плагин связок. Панель телепортирована,
 * и опция ищется по документу.
 */
function SelectItemProbe(props: SelectItemProps): ReactNode {
	return (
		<Select>
			<Select.Item value="a" text="A" {...props} />
		</Select>
	)
}

/** Группа опций — в Select, в его телепортированной панели. */
function SelectGroupProbe(props: SelectGroupProps): ReactNode {
	return (
		<Select>
			<Select.Group label="Фрукты" {...props}>
				<Select.Item value="a" text="A" />
			</Select.Group>
		</Select>
	)
}

/** Строка пункта меню любого вида — узел с ролью `menuitem*` прямо в его корне. */
const MENU_ROW = '.so-menu-item > [role^="menuitem"]'

/** Элемент коллекции, класс его корня и строка, которой уходят атрибуты потребителя. */
const ITEMS: ReadonlyArray<readonly [string, ComponentType<TItemProbeProps>, string, string]> = [
	['Tabs.Item', TabsItemProbe, '.so-tabs-item', '.so-tabs-item [role="tab"]'],
	['Accordion.Item', AccordionItemProbe, '.so-accordion-item', '.so-accordion-item__header'],
	['RadioGroup.Item', RadioGroupItemProbe, '.so-radio-group-item', '.so-radio-group-item__input'],
	['Menu.Item', MenuItemProbe, '.so-menu-item', MENU_ROW],
	['Menu.CheckboxItem', MenuCheckboxItemProbe, '.so-menu-item', MENU_ROW],
	['Menu.RadioItem', MenuRadioItemProbe, '.so-menu-item', MENU_ROW],
	['Menu.Submenu', MenuSubmenuProbe, '.so-menu-item', MENU_ROW],
	['Menu.PopoverItem', MenuPopoverItemProbe, '.so-menu-item', MENU_ROW],
	['Tags.Item', TagsItemProbe, '.so-tags-item', '.so-tags-item [role="listitem"]'],
	['Select.Item', SelectItemProbe, '.so-select-item', '.so-select-item [role="option"]'],
]

describe('атрибут снаружи перекрывает набор ядра', () => {
	/** `dir` ядро пишет в `attrs` по `direction`, а `dir` снаружи — атрибут потребителя. */
	it.each(COMPONENTS)(
		'%s: dir потребителя — поверх dir ядра',
		(_name, Component, selector, own) => {
			mount(<Component {...own} direction="rtl" dir="ltr" />)

			expect(find(document, selector, HTMLElement).getAttribute('dir')).toBe('ltr')
		},
	)

	it.each(DATES)('%s: dir потребителя — поверх dir ядра', (_name, Probe, selector) => {
		mount(<Probe direction="rtl" dir="ltr" />)

		expect(find(document, selector, HTMLElement).getAttribute('dir')).toBe('ltr')
	})

	it.each(DATES)('%s: класс потребителя — после классов ядра', (_name, Probe, selector) => {
		mount(<Probe className="mine" />)

		const classes = [...find(document, selector, HTMLElement).classList]

		expect(classes.at(-1)).toBe('mine')
		expect(classes[0]).toBe(selector.slice(1))
	})

	it.each(DATES)('%s: id, title и data-* потребителя — на корне', (_name, Probe, selector) => {
		mount(<Probe id="mine" title="Своё" data-probe="1" />)

		const root = find(document, selector, HTMLElement)

		expect(root.id).toBe('mine')
		expect(root.title).toBe('Своё')
		expect(root.dataset['probe']).toBe('1')
	})

	it('Button на div: tabIndex потребителя — поверх tabindex="0" ядра', () => {
		const { root } = mount(<Button tag="div" tabIndex={-1} />)

		expect(root().getAttribute('role')).toBe('button')
		expect(root().getAttribute('tabindex')).toBe('-1')
	})

	it('Button на div: role потребителя — поверх role="button" ядра', () => {
		const { root } = mount(<Button tag="div" role="link" />)

		expect(root().getAttribute('role')).toBe('link')
	})

	it('без атрибута снаружи остаётся набор ядра', () => {
		const { root } = mount(<Button tag="div" direction="rtl" />)

		expect(root().getAttribute('tabindex')).toBe('0')
		expect(root().getAttribute('dir')).toBe('rtl')
	})
})

describe('элемент коллекции: атрибуты снаружи — строке, поверх её aria', () => {
	/** `id` строке пишет коллекция при входе элемента — связка с панелью. */
	it.each(ITEMS)('%s: id потребителя — поверх id коллекции', (_name, Probe, _root, row) => {
		mount(<Probe id="mine" />)

		expect(find(document, row, HTMLElement).id).toBe('mine')
	})

	it.each(ITEMS)('%s: класс и стиль — корню, а не строке', (_name, Probe, root, row) => {
		mount(<Probe className="mine" style={{ color: 'red' }} />)

		expect(find(document, root, HTMLElement).classList.contains('mine')).toBe(true)
		expect(find(document, root, HTMLElement).style.color).toBe('red')
		expect(find(document, row, HTMLElement).classList.contains('mine')).toBe(false)
	})
})

/** Контрол с ошибкой: её задают инстансу — в разметке её задаёт поле формы. */
function invalid<T extends { invalid: boolean }>(ctrl: T): T {
	ctrl.invalid = true

	return ctrl
}

/**
 * Поле, как его рисовать — выключенным и с ошибкой, — и класс его корня.
 * Ошибку пишет поле формы `Field`, здесь — инстанс.
 */
const FIELDS: ReadonlyArray<readonly [string, () => ReactNode, string]> = [
	['Input', () => <Input ctrl={invalid(new TInput({ disabled: true }))} />, '.so-input'],
	[
		'NumberInput',
		() => <NumberInput ctrl={invalid(new TNumberInput({ disabled: true }))} />,
		'.so-number-input',
	],
	[
		'CheckBox',
		() => <CheckBox ctrl={invalid(new TCheckBox({ disabled: true }))} />,
		'.so-check-box',
	],
	['Switch', () => <Switch ctrl={invalid(new TSwitch({ disabled: true }))} />, '.so-switch'],
	[
		'Textarea',
		() => <Textarea ctrl={invalid(new TTextarea({ disabled: true }))} />,
		'.so-textarea',
	],
	['Select', () => <Select ctrl={invalid(new TSelect({ disabled: true }))} />, '.so-select'],
]

/**
 * Поле внутри корня: `<input>`, у Textarea — `<textarea>`, у NumberInput —
 * первый `<input>`, ввод: скрытое поле формы стоит последним.
 */
const CONTROL = 'input, textarea'

/**
 * Тема красит коробку поля и подпись поля формы `Field` по корню поля —
 * прямому ребёнку обёртки контрола, — поэтому `dataset` (`data-disabled`,
 * `data-invalid`) — на корне, а ошибку скринридеру объявляет поле: `<input>`,
 * у Textarea — `<textarea>`.
 */
describe('поле: dataset — на корне, aria — у поля', () => {
	it.each(FIELDS)(
		'%s: data-disabled и data-invalid — на корне, aria-invalid — у поля',
		(_name, draw, selector) => {
			mount(<>{draw()}</>)

			const root = find(document, selector, HTMLElement)
			const input = find(root, CONTROL, HTMLElement)

			expect(root.dataset['disabled']).toBe('true')
			expect(root.dataset['invalid']).toBe('true')
			expect(input.hasAttribute('data-disabled')).toBe(false)
			expect(input.hasAttribute('data-invalid')).toBe(false)
			expect(input.getAttribute('aria-invalid')).toBe('true')
		},
	)
})

/** Общие пропсы списков в таблице. */
type TListProbeProps = ListBoxProps & TabsProps

/**
 * Список, класс его корня и узел списка с ролью, которому уходят атрибуты
 * потребителя: на нём `aria` компонента, а корень — рамка (шапка и подвал
 * ListBox, панели Tabs). У ListBox узел списка — ребёнок корня, у Tabs —
 * ребёнок ряда, где рядом со списком стоят слоты.
 */
const LISTS: ReadonlyArray<readonly [string, ComponentType<TListProbeProps>, string, string]> = [
	['ListBox', ListBox, '.so-list-box', '.so-list-box > [role="listbox"]'],
	['Tabs', Tabs, '.so-tabs', '.so-tabs > .so-tabs__bar > [role="tablist"]'],
]

describe('ListBox, Tabs: атрибуты снаружи — узлу списка, поверх его aria', () => {
	it.each(LISTS)(
		'%s: aria-label, id и data-* — на узле списка, а не на корне',
		(_name, List, root, list) => {
			mount(<List aria-label="Своё" id="mine" data-probe="1" />)

			const node = find(document, list, HTMLElement)

			expect(node.getAttribute('aria-label')).toBe('Своё')
			expect(node.id).toBe('mine')
			expect(node.dataset['probe']).toBe('1')
			expect(
				['aria-label', 'id', 'data-probe'].filter((name) =>
					find(document, root, HTMLElement).hasAttribute(name),
				),
			).toEqual([])
		},
	)

	/** Имя пишет плагин доступного имени в `aria`, а `aria-label` снаружи — атрибут потребителя. */
	it.each(LISTS)('%s: aria-label потребителя — поверх aria_label', (_name, List, _root, list) => {
		mount(<List aria_label="Ядро" aria-label="Своё" />)

		expect(find(document, list, HTMLElement).getAttribute('aria-label')).toBe('Своё')
	})

	it.each(LISTS)('%s: класс и стиль — корню, а не узлу списка', (_name, List, root, list) => {
		mount(<List className="mine" style={{ color: 'red' }} />)

		const node = find(document, list, HTMLElement)

		expect(find(document, root, HTMLElement).classList.contains('mine')).toBe(true)
		expect(find(document, root, HTMLElement).style.color).toBe('red')
		expect(node.classList.contains('mine')).toBe(false)
		expect(node.style.color).toBe('')
	})

	/** `dir` ядро пишет в `attrs` по `direction`, на корень; `dir` снаружи — узлу списка. */
	it.each(LISTS)(
		'%s: dir ядра — на корне, dir потребителя — на узле списка',
		(_name, List, root, list) => {
			mount(<List direction="rtl" dir="ltr" />)

			expect(find(document, root, HTMLElement).getAttribute('dir')).toBe('rtl')
			expect(find(document, list, HTMLElement).getAttribute('dir')).toBe('ltr')
		},
	)

	it.each(LISTS)('%s: обработчик потребителя — на узле списка', (_name, List, _root, list) => {
		const targets: EventTarget[] = []

		mount(<List onClick={(event) => targets.push(event.currentTarget)} />)

		const node = find(document, list, HTMLElement)

		act(() => node.click())

		expect(targets).toHaveLength(1)
		expect(targets[0]).toBe(node)
	})

	it('ListBox: tabIndex={-1} снимает список с остановок Tab', () => {
		const { root } = mount(<ListBox tabIndex={-1} />)

		expect(find(root(), '[role="listbox"]', HTMLElement).getAttribute('tabindex')).toBe('-1')
		expect(root().hasAttribute('tabindex')).toBe(false)
	})
})

/** Пропсы, которые таблица `ref` отдаёт каждому компоненту: `ref` и события привязки корня. */
type TRefProbeProps = {
	ref?: Ref<Element>
	onElementReady?: (element: Element) => void
	onElementRemoved?: () => void
}

const COLUMNS: TTableColumnSource[] = [{ field: 'name', text: 'Имя', rowHeader: true }]

/** Элемент списка — в списке: без него у элемента нет коллекции. */
function ListBoxItemProbe(props: ListBoxItemProps): ReactNode {
	return (
		<ListBox>
			<ListBox.Item value="a" text="A" {...props} />
		</ListBox>
	)
}

/**
 * Компонент со своим корнем, как его рисовать, узел, который получает `ref`
 * потребителя, и узел, с которым приходит `element:ready`. Это один узел — у
 * всех, кроме таблицы: её `ref` получает окно, внешний узел, куда ложатся
 * атрибуты потребителя, а к `TElementPlugin` привязан корень `table`. Поле и
 * элемент коллекции отдают корень, а не `<input>` и не строку, окно и
 * выезжающая панель — панель в телепорте, а не подложку, менеджер тостов —
 * регион в телепорте: приложение в его `children` — не его разметка.
 */
const ROOTS: ReadonlyArray<
	readonly [string, (props: TRefProbeProps) => ReactNode, string, string]
> = [
	['Button', (props) => <Button {...props} />, '.so-button', '.so-button'],
	[
		'ComponentView',
		(props) => <ComponentView {...props} />,
		'.so-component-view',
		'.so-component-view',
	],
	['Frame', (props) => <Frame {...props} />, '.so-frame', '.so-frame'],
	['Popover', (props) => <Popover {...props} />, '.so-popover', '.so-popover'],
	['Tooltip', (props) => <Tooltip {...props} />, '.so-tooltip', '.so-tooltip'],
	['Menu', (props) => <Menu {...props} />, '.so-menu', '.so-menu'],
	['Menu.Item', (props) => <MenuItemProbe {...props} />, '.so-menu-item', '.so-menu-item'],
	[
		'Menu.CheckboxItem',
		(props) => <MenuCheckboxItemProbe {...props} />,
		'.so-menu-item',
		'.so-menu-item',
	],
	[
		'Menu.RadioItem',
		(props) => <MenuRadioItemProbe {...props} />,
		'.so-menu-item',
		'.so-menu-item',
	],
	['Menu.Submenu', (props) => <MenuSubmenuProbe {...props} />, '.so-menu-item', '.so-menu-item'],
	[
		'Menu.PopoverItem',
		(props) => <MenuPopoverItemProbe {...props} />,
		'.so-menu-item',
		'.so-menu-item',
	],
	[
		'Menu.Group',
		(props) => (
			<Menu open>
				<Menu.Group label="Вид" {...props} />
			</Menu>
		),
		'.so-menu-group',
		'.so-menu-group',
	],
	[
		'Menu.RadioGroup',
		(props) => (
			<Menu open>
				<Menu.RadioGroup label="Сортировка" {...props} />
			</Menu>
		),
		'.so-menu-group',
		'.so-menu-group',
	],
	[
		'Menu.Separator',
		(props) => (
			<Menu open>
				<Menu.Separator {...props} />
			</Menu>
		),
		'.so-menu-separator',
		'.so-menu-separator',
	],
	['Dialog', (props) => <Dialog {...props} />, '.so-dialog', '.so-dialog'],
	['Drawer', (props) => <Drawer {...props} />, '.so-drawer', '.so-drawer'],
	['Toasts', (props) => <Toasts {...props} />, '.so-toasts', '.so-toasts'],
	['Field', (props) => <Field {...props} />, '.so-field', '.so-field'],
	['Icon', (props) => <Icon tag="i" {...props} />, '.so-icon', '.so-icon'],
	['Label', (props) => <Label {...props} />, '.so-label', '.so-label'],
	[
		'ProgressLinear',
		(props) => <ProgressLinear {...props} />,
		'.so-progress-linear',
		'.so-progress-linear',
	],
	[
		'ProgressSpinner',
		(props) => <ProgressSpinner {...props} />,
		'.so-progress-spinner',
		'.so-progress-spinner',
	],
	['Skeleton', (props) => <Skeleton {...props} />, '.so-skeleton', '.so-skeleton'],
	['Slider', (props) => <Slider {...props} />, '.so-slider', '.so-slider'],
	['Rating', (props) => <Rating {...props} />, '.so-rating', '.so-rating'],
	['Pagination', (props) => <Pagination {...props} />, '.so-pagination', '.so-pagination'],
	['Scroller', (props) => <Scroller {...props} />, '.so-scroller', '.so-scroller'],
	['Input', (props) => <Input {...props} />, '.so-input', '.so-input'],
	['NumberInput', (props) => <NumberInput {...props} />, '.so-number-input', '.so-number-input'],
	['Textarea', (props) => <Textarea {...props} />, '.so-textarea', '.so-textarea'],
	['CheckBox', (props) => <CheckBox {...props} />, '.so-check-box', '.so-check-box'],
	['Switch', (props) => <Switch {...props} />, '.so-switch', '.so-switch'],
	['Tabs', (props) => <Tabs {...props} />, '.so-tabs', '.so-tabs'],
	['Tabs.Item', (props) => <TabsItemProbe {...props} />, '.so-tabs-item', '.so-tabs-item'],
	[
		'Tabs.Content',
		(props) => <TabsContentProbe {...props} />,
		'.so-tabs__panel',
		'.so-tabs__panel',
	],
	['Accordion', (props) => <Accordion {...props} />, '.so-accordion', '.so-accordion'],
	[
		'Accordion.Item',
		(props) => <AccordionItemProbe {...props} />,
		'.so-accordion-item',
		'.so-accordion-item',
	],
	['RadioGroup', (props) => <RadioGroup {...props} />, '.so-radio-group', '.so-radio-group'],
	[
		'RadioGroup.Item',
		(props) => <RadioGroupItemProbe {...props} />,
		'.so-radio-group-item',
		'.so-radio-group-item',
	],
	['ListBox', (props) => <ListBox {...props} />, '.so-list-box', '.so-list-box'],
	[
		'ListBox.Item',
		(props) => <ListBoxItemProbe {...props} />,
		'.so-list-box-item',
		'.so-list-box-item',
	],
	['Tags', (props) => <Tags {...props} />, '.so-tags', '.so-tags'],
	['Tags.Item', (props) => <TagsItemProbe {...props} />, '.so-tags-item', '.so-tags-item'],
	// Корень Select — рамка вокруг поля, а не `<input>` и не телепортированная панель
	['Select', (props) => <Select {...props} />, '.so-select', '.so-select'],
	[
		'Select.Item',
		(props) => <SelectItemProbe {...props} />,
		'.so-select-item',
		'.so-select-item',
	],
	[
		'Select.Group',
		(props) => <SelectGroupProbe {...props} />,
		'.so-select-group',
		'.so-select-group',
	],
	[
		'Table',
		(props) => (
			<Table columns={COLUMNS} items={[{ data: { id: 1, name: 'Анна' } }]} {...props} />
		),
		'.so-table__viewport',
		'table.so-table',
	],
	// Корень поля даты — коробка вокруг ряда частей, а не часть
	['DateInput', (props) => <DateInput {...props} />, '.so-date-input', '.so-date-input'],
	// Корень календаря — сетки с кнопками листания, а не день и не панель выбора месяца
	['Calendar', (props) => <Calendar {...props} />, '.so-calendar', '.so-calendar'],
	// Корень DatePicker — якорь панели вокруг полей, а не поле и не телепортированная панель
	['DatePicker', (props) => <DatePicker {...props} />, '.so-date-picker', '.so-date-picker'],
]

/** Поля: `ref` потребителя — корень, а не `<input>` или `<textarea>`. */
const FIELD_ROOTS = ROOTS.filter(([name]) =>
	[
		'Input',
		'NumberInput',
		'Textarea',
		'CheckBox',
		'Switch',
		'RadioGroup.Item',
		'Select',
	].includes(name),
)

/** Узлы, которые получила `ref`-функция потребителя, — по порядку вызовов. */
type TRefProbe = {
	readonly ref: (node: Element | null) => void
	readonly nodes: readonly (Element | null)[]
}

function refProbe(): TRefProbe {
	const nodes: (Element | null)[] = []

	return {
		nodes,
		ref: (node) => {
			nodes.push(node)
		},
	}
}

/** Узлы сверяются по ссылке: `toEqual` сравнил бы узлы по разметке. */
function expectNodes(
	actual: readonly (Element | null)[],
	expected: readonly (Element | null)[],
): void {
	expect(actual).toHaveLength(expected.length)
	expected.forEach((node, index) => expect(actual[index]).toBe(node))
}

/**
 * `ref` потребителя получает корень компонента — узел, на который ложатся его
 * класс и атрибуты, — у поля и элемента коллекции тоже корень, а у таблицы —
 * окно. Отдаёт его ref адаптера тем же вызовом, что привязывает корень к
 * `TElementPlugin`, и привязку он не выбивает. Снятие — как у React: функции
 * `null` или её очистка, объекту `current = null`.
 */
describe('ref потребителя — корень компонента', () => {
	it.each(ROOTS)('%s: ref-функция — корень, размонтирование — null', (_name, draw, selector) => {
		const probe = refProbe()
		const { render } = mount(<>{draw({ ref: probe.ref })}</>)
		const root = find(document, selector, Element)

		expectNodes(probe.nodes, [root])

		render(<></>)

		expectNodes(probe.nodes, [root, null])
	})

	it.each(ROOTS)(
		'%s: объектный ref — current, размонтирование — null',
		(_name, draw, selector) => {
			const ref = createRef<Element>()
			const { render } = mount(<>{draw({ ref })}</>)

			expect(ref.current).toBe(find(document, selector, Element))

			render(<></>)

			expect(ref.current).toBeNull()
		},
	)

	it.each(ROOTS)(
		'%s: element:ready приходит с привязанным корнем',
		async (_name, draw, _selector, bound) => {
			const ready: Element[] = []

			mount(<>{draw({ ref: createRef(), onElementReady: (node) => ready.push(node) })}</>)
			await nextFrame()

			expectNodes(ready, [find(document, bound, Element)])
		},
	)

	it.each(FIELD_ROOTS)('%s: ref — корень, а не поле', (_name, draw, selector) => {
		const probe = refProbe()

		mount(<>{draw({ ref: probe.ref })}</>)

		const root = find(document, selector, Element)

		expect(probe.nodes[0]).toBe(root)
		expect(probe.nodes).not.toContain(find(root, CONTROL, HTMLElement))
	})

	/** Смена тега пересоздаёт узел: прежний корень потребитель отпускает, новый получает. */
	it('смена tag — потребителю новый корень', async () => {
		const ctrl = new TButton()
		const probe = refProbe()
		const ready: Element[] = []
		const { root } = mount(
			<Button ctrl={ctrl} ref={probe.ref} onElementReady={(node) => ready.push(node)} />,
		)
		const first = root()

		act(() => {
			ctrl.tag = 'span'
		})
		await nextFrame()

		expect(root()).not.toBe(first)
		expect(root().localName).toBe('span')
		expectNodes(probe.nodes, [first, null, root()])
		expect(ready.at(-1)).toBe(root())
	})

	/**
	 * Ref корня между рендерами тот же, и сменившийся `ref` потребителя корень
	 * не перепривязывает: `TElementPlugin` не объявляет тот же узел парой
	 * `removed` + `ready`. Узел — как отдал бы React: прежний `ref` его
	 * отпускает, новый получает.
	 */
	it('смена ref потребителя — без removed и ready, прежнему null, новому корень', async () => {
		const before = refProbe()
		const after = createRef<Element>()
		const events: string[] = []
		const view = (ref: Ref<Element>) => (
			<Button
				ref={ref}
				onElementReady={() => events.push('ready')}
				onElementRemoved={() => events.push('removed')}
			/>
		)
		const { root, render } = mount(view(before.ref))

		await nextFrame()
		render(view(after))
		await nextFrame()

		expectNodes(before.nodes, [root(), null])
		expect(after.current).toBe(root())
		expect(events).toEqual(['ready'])
	})

	/** Очистка из React 19: вернул её `ref` — при снятии зовётся она, а не `ref(null)`. */
	it('ref-функция с очисткой — при снятии очистка, а не null', () => {
		const nodes: (Element | null)[] = []
		const released: Element[] = []
		const ref = (node: Element | null) => {
			nodes.push(node)

			return () => {
				if (node) released.push(node)
			}
		}
		const { root, render } = mount(<Input ref={ref} />)
		const node = root()

		render(<></>)

		expectNodes(nodes, [node])
		expectNodes(released, [node])
	})

	/**
	 * StrictMode снимает и ставит ref заново и пересобирает контексты
	 * компонента: потребитель получает корень, отпускает и получает снова —
	 * как ref любого узла, — а привязан корень к последнему контексту.
	 */
	it('StrictMode — корень, null, корень; element:ready — с корнем', async () => {
		const probe = refProbe()
		const ready: Element[] = []
		const { root } = mount(
			<StrictMode>
				<Button ref={probe.ref} onElementReady={(node) => ready.push(node)} />
			</StrictMode>,
		)

		await nextFrame()

		expectNodes(probe.nodes, [root(), null, root()])
		expect(ready.at(-1)).toBe(root())
	})

	it('делёж атрибутов поля: ref — не полю', () => {
		const ref = createRef<Element>()
		const forward = { className: 'mine', style: { color: 'red' }, title: 'Подсказка', ref }

		expect(toRootForward(forward)).toEqual({ className: 'mine', style: { color: 'red' } })
		expect(toControlAttrs(forward)).toEqual({ title: 'Подсказка' })
	})
})

/**
 * На сервере ref узлов React не зовёт, и `ref` потребителя разметки не
 * меняет: ни атрибута, ни вызова. При гидратации `ref` получает корень из
 * разметки сервера — тот же узел, а не новый.
 */
describe('ref потребителя · серверный рендер', () => {
	it.each(ROOTS)('%s: ref не зовётся, разметка — та же', (_name, draw) => {
		const probe = refProbe()
		const markup = renderToString(<>{draw({ ref: probe.ref })}</>)

		expect(probe.nodes).toHaveLength(0)
		expect(markup).toBe(renderToString(<>{draw({})}</>))
	})

	it.each(FIELD_ROOTS)('%s: гидратация — корень из разметки сервера', (_name, draw, selector) => {
		const probe = refProbe()
		const onRecoverableError = vi.fn()
		const container = document.createElement('div')

		container.innerHTML = renderToString(<>{draw({ ref: probe.ref })}</>)
		document.body.append(container)

		const server = find(container, selector, Element)

		act(() => {
			track(hydrateRoot(container, <>{draw({ ref: probe.ref })}</>, { onRecoverableError }))
		})

		expect(onRecoverableError).not.toHaveBeenCalled()
		expectNodes(probe.nodes, [server])
	})
})

/** Таблица из одной строки и одной колонки. */
function TableProbe(props: TableProps): ReactNode {
	return <Table columns={COLUMNS} items={[{ data: { id: 1, name: 'Анна' } }]} {...props} />
}

/** Окно таблицы и `table` в нём. */
function tableParts(): { viewport: HTMLElement; table: HTMLElement } {
	return {
		viewport: find(document, '.so-table__viewport', HTMLElement),
		table: find(document, '.so-table__viewport > table.so-table', HTMLElement),
	}
}

/**
 * Корень таблицы стоит внутри окна (`div.so-table__viewport`), и атрибуты
 * потребителя делятся, как у поля (`toWrappedRootProps`): класс, стиль, `ref`
 * и скрытие — окну, внешнему узлу компонента, остальное — `table`, поверх её
 * наборов, где роль и имя таблицы. На окне `aria-label` называл бы узел без
 * роли, а у таблицы имени не было бы.
 */
describe('корень внутри обёртки: атрибуты снаружи — table, класс и стиль — окну', () => {
	it('aria-label, id и data-* — на table, а не на окне', () => {
		mount(<TableProbe aria-label="Сотрудники" id="staff" data-probe="1" />)

		const { viewport, table } = tableParts()

		expect(table.getAttribute('aria-label')).toBe('Сотрудники')
		expect(table.id).toBe('staff')
		expect(table.dataset['probe']).toBe('1')
		expect(
			['aria-label', 'id', 'data-probe'].filter((name) => viewport.hasAttribute(name)),
		).toEqual([])
	})

	/** Имя пишет плагин доступного имени в `aria` таблицы, `dir` ядро — в её `attrs`. */
	it('aria-label и dir потребителя — поверх aria_label и dir ядра', () => {
		mount(<TableProbe aria_label="Ядро" aria-label="Своё" direction="rtl" dir="ltr" />)

		const { viewport, table } = tableParts()

		expect(table.getAttribute('aria-label')).toBe('Своё')
		expect(table.getAttribute('dir')).toBe('ltr')
		expect(viewport.hasAttribute('dir')).toBe(false)
	})

	it('класс, стиль и скрытие — окну, а не table', () => {
		const { render } = mount(<TableProbe className="mine" style={{ color: 'red' }} />)
		const { viewport, table } = tableParts()

		expect([...viewport.classList]).toEqual(['so-table__viewport', 'mine'])
		expect(viewport.style.color).toBe('red')
		expect(table.classList.contains('mine')).toBe(false)
		expect(table.style.color).toBe('')

		render(<TableProbe className="mine" style={{ color: 'red' }} visible={false} />)

		expect(viewport.style.display).toBe('none')
		expect(table.style.display).toBe('')
	})

	it('обработчик потребителя — на table', () => {
		const targets: EventTarget[] = []

		mount(<TableProbe onClick={(event) => targets.push(event.currentTarget)} />)

		const { table } = tableParts()

		act(() => table.click())

		expect(targets).toHaveLength(1)
		expect(targets[0]).toBe(table)
	})

	it('смена атрибута — на table, окно и table — те же узлы', () => {
		const { render } = mount(<TableProbe title="a" />)
		const before = tableParts()

		render(<TableProbe title="b" />)

		const after = tableParts()

		expect(after.viewport).toBe(before.viewport)
		expect(after.table).toBe(before.table)
		expect(after.table.getAttribute('title')).toBe('b')
		expect(after.viewport.hasAttribute('title')).toBe(false)
	})

	/** Стиль окна React ставит по свойствам: чужого свойства он не снимает. */
	it('свойство, записанное в окно мимо разметки, переживает смену стиля и видимости', () => {
		const { render } = mount(<TableProbe style={{ color: 'red' }} />)
		const { viewport } = tableParts()

		viewport.style.setProperty('--so-probe', '1')
		render(<TableProbe style={{ color: 'blue' }} visible={false} />)

		expect(viewport.style.display).toBe('none')

		render(<TableProbe style={{ color: 'blue' }} />)

		expect(viewport.style.color).toBe('blue')
		expect(viewport.style.display).toBe('')
		expect(viewport.style.getPropertyValue('--so-probe')).toBe('1')
	})

	/** Сам делёж: `ref` потребителя — окну, корню — привязка адаптера последней. */
	it('делёж атрибутов окна: класс, стиль и ref — окну, остальное — корню поверх наборов', () => {
		const ref = createRef<Element>()
		const bind = vi.fn<(element: Element | null) => void>()
		const forward = {
			className: 'mine',
			style: { color: 'red' },
			ref,
			'aria-label': 'Своё',
			title: 'Подсказка',
		}
		const { wrapper, root } = toWrappedRootProps(
			bind,
			{ classes: ['so-table'], visible: false },
			[{ 'aria-label': 'Ядро', role: 'grid' }],
			forward,
			'so-table__viewport',
		)

		expect(wrapper).toEqual({
			ref,
			className: 'so-table__viewport mine',
			style: { color: 'red', display: 'none' },
		})
		expect(root).toEqual({
			'aria-label': 'Своё',
			role: 'grid',
			title: 'Подсказка',
			className: 'so-table',
			style: {},
			ref: bind,
		})
	})
})

/**
 * Имена стиля плагина раскладки React получает в camelCase (`z-index` →
 * `zIndex`, сторожит `frame.spec.tsx`), а пользовательское свойство — под
 * своим именем: `--dialogWidth` было бы другим свойством, и тема его не
 * прочла бы. Так размер отдают плагины раскладки окна и выезжающей панели.
 */
describe('раскладка корня: пользовательское свойство — под своим именем', () => {
	it('--* из layout_styles доходит до узла как есть', () => {
		const layout = toRootLayout({ layout_styles: { '--so-dialog-width': '320px' } }, {})
		const { root } = mount(<div {...layout} />)

		expect(root().style.getPropertyValue('--so-dialog-width')).toBe('320px')
	})

	it('Dialog и Drawer: размер — переменной под её именем', () => {
		mount(
			<>
				<Dialog width={320} />
				<Drawer height="40vh" />
			</>,
		)

		expect(
			find(document, '.so-dialog', HTMLElement).style.getPropertyValue('--so-dialog-width'),
		).toBe('320px')
		expect(
			find(document, '.so-drawer', HTMLElement).style.getPropertyValue('--so-drawer-height'),
		).toBe('40vh')
	})
})

/**
 * Стиль-выход компонента — стиль, который считает ядро: доля кольца
 * (`fractionStyle`). Раскладка корня кладёт его поверх стиля плагина, под
 * стилем потребителя — как во Vue, где атрибуты снаружи ложатся на корень
 * последними, — и под `display: none` скрытого корня, как у `v-show`.
 */
describe('раскладка корня: стиль-выход компонента', () => {
	/**
	 * Стиль потребителя с долей кольца. Пользовательских свойств в
	 * `CSSProperties` React нет, а словарь строк ему подходит.
	 */
	const consumer: Record<string, string> = { '--so-progress-spinner-fraction': '0.9' }

	it('ProgressSpinner: стиль потребителя — поверх доли', () => {
		const { root } = mount(<ProgressSpinner value={40} style={consumer} />)

		expect(root().style.getPropertyValue('--so-progress-spinner-fraction')).toBe('0.9')
	})

	it('ProgressLinear: стиль потребителя — поверх доли', () => {
		const percent: Record<string, string> = { '--so-progress-linear-percent': '90%' }
		const { root } = mount(<ProgressLinear value={40} style={percent} />)

		expect(root().style.getPropertyValue('--so-progress-linear-percent')).toBe('90%')
	})

	it('ProgressSpinner: display: none скрытого корня — поверх стиля потребителя и доли', () => {
		const { root } = mount(
			<ProgressSpinner value={40} visible={false} style={{ display: 'inline-block' }} />,
		)

		expect(root().style.display).toBe('none')
		// Скрытие трогает только `display`: доля остаётся на корне
		expect(root().style.getPropertyValue('--so-progress-spinner-fraction')).toBe('0.4')
	})

	/** Плагина раскладки у кольца нет — правило проверяется на самой раскладке корня. */
	it('стиль-выход — поверх стиля плагина, имена по-CSS — как у плагина', () => {
		const layout = toRootLayout(
			{ layout_styles: { '--ring': 'plugin' } },
			{},
			{ '--ring': 'own', 'z-index': 3 },
		)
		const { root } = mount(<div {...layout} />)

		expect(root().style.getPropertyValue('--ring')).toBe('own')
		// `z-index` → `zIndex`, как у плагина: к числу под незнакомым именем
		// React дописал бы `px`
		expect(root().style.zIndex).toBe('3')
	})
})
