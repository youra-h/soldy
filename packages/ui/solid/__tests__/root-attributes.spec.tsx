/**
 * Порядок атрибутов корня — один у всех компонентов (`createRootProps`).
 *
 * Наборы ядра (`attrs`, `aria`, `dataset`) ложатся первыми, атрибуты снаружи —
 * поверх них, как у Vue, где атрибуты снаружи падают на корень последними.
 * Раньше компоненты Solid разворачивали наборы ядра после атрибутов
 * потребителя, и набор ядра их перекрывал: `tabindex="-1"` строки списка
 * проиграл бы `tabindex="0"`, который кнопка на `div` ставит себе сама, —
 * строки списка стали бы остановками Tab.
 *
 * `ref` адаптера — последним: `ref` потребителя из его атрибутов выбил бы
 * привязку корня к `TElementPlugin` — не было бы `element:ready`. Корень
 * `ref` потребителя отдаёт сам `ref` адаптера, тем же вызовом, — у поля тоже
 * корень, а не `<input>`.
 *
 * У поля атрибуты потребителя делятся, как у Vue: класс и стиль — корню,
 * остальное, кроме `ref`, — `<input>`, поверх его `aria`, а корень остаётся
 * за адаптером. Элемент коллекции (`Tabs.Item`, `Accordion.Item`,
 * `RadioGroup.Item`) делит их так же: остальное — строке, у радио — полю. И
 * ListBox с Tabs: остальное — узлу списка с ролью (`listbox`, `tablist`).
 *
 * Стиль Solid ставит объектом по свойству и не трогает того, что плагины
 * пишут в узел сами: сдвиг смахиваемой панели (`--so-swipe-offset`) переживает
 * смену раскладки и видимости.
 */

import { describe, it, expect, vi } from 'vitest'
import { createSignal, type Component, type JSX } from 'solid-js'
import { TButton, type TTableColumnSource } from '@soldy-ui/core'
import {
	Accordion,
	Button,
	CheckBox,
	ComponentView,
	Field,
	Frame,
	Icon,
	Input,
	Label,
	ListBox,
	ProgressSpinner,
	RadioGroup,
	Skeleton,
	Switch,
	Table,
	Tabs,
	toControlAttrs,
	toRootForward,
	toRootLayout,
	toRootProps,
	type AccordionItemProps,
	type AccordionProps,
	type ButtonProps,
	type CheckBoxProps,
	type ComponentViewProps,
	type FieldProps,
	type FrameProps,
	type IconProps,
	type InputProps,
	type LabelProps,
	type ListBoxItemProps,
	type ListBoxProps,
	type ProgressSpinnerProps,
	type RadioGroupItemProps,
	type RadioGroupProps,
	type SkeletonProps,
	type SwitchProps,
	type TableProps,
	type TabsContentProps,
	type TabsItemProps,
	type TabsProps,
} from '@soldy-ui/solid'
import { find, mount, nextFrame } from './mount'

/** Общие пропсы строки таблицы: направление, атрибуты и колбэк готовности есть у всех. */
type TProbeProps = ButtonProps &
	ComponentViewProps &
	FieldProps &
	FrameProps &
	IconProps &
	LabelProps &
	ProgressSpinnerProps &
	SkeletonProps &
	TabsProps &
	AccordionProps &
	RadioGroupProps &
	TabsContentProps

/** Панель рисуется, пока активен её таб, — и только внутри набора. */
function TabsContentProbe(props: TabsContentProps): JSX.Element {
	return (
		<Tabs content={<Tabs.Content value="a" {...props} />}>
			<Tabs.Item value="a" text="A" active />
		</Tabs>
	)
}

/**
 * Компонент, класс его корня и пропсы, без которых его корень не виден: Frame
 * по умолчанию скрыт и уходит телепортом в `body` — корень ищется по документу.
 */
const COMPONENTS: ReadonlyArray<
	readonly [string, Component<TProbeProps>, string, Partial<TProbeProps>]
> = [
	['Button', Button, '.so-button', {}],
	['ComponentView', ComponentView, '.so-component-view', {}],
	['Field', Field, '.so-field', {}],
	['Frame', Frame, '.so-frame', { visible: true }],
	['Icon', Icon, '.so-icon', { tag: 'i' }],
	['Label', Label, '.so-label', {}],
	['ProgressSpinner', ProgressSpinner, '.so-progress-spinner', {}],
	['Skeleton', Skeleton, '.so-skeleton', {}],
	['Tabs.Content', TabsContentProbe, '.so-tabs__panel', {}],
	['Accordion', Accordion, '.so-accordion', {}],
	['RadioGroup', RadioGroup, '.so-radio-group', {}],
]

/** Общие пропсы элементов коллекций в таблице. */
type TItemProbeProps = TabsItemProps & AccordionItemProps & RadioGroupItemProps

/** Таб — в наборе: `id` строке пишет коллекция. */
function TabsItemProbe(props: TabsItemProps): JSX.Element {
	return (
		<Tabs>
			<Tabs.Item value="a" text="A" active {...props} />
		</Tabs>
	)
}

/** Секция — в аккордеоне: `id` заголовку пишет коллекция. */
function AccordionItemProbe(props: AccordionItemProps): JSX.Element {
	return (
		<Accordion>
			<Accordion.Item value="a" text="A" {...props} />
		</Accordion>
	)
}

/** Радио — в группе; строки у него нет, атрибуты потребителя уходят полю. */
function RadioGroupItemProbe(props: RadioGroupItemProps): JSX.Element {
	return (
		<RadioGroup>
			<RadioGroup.Item value="a" {...props} />
		</RadioGroup>
	)
}

/** Элемент списка — в списке: без него у элемента нет коллекции. */
function ListBoxItemProbe(props: ListBoxItemProps): JSX.Element {
	return (
		<ListBox>
			<ListBox.Item value="a" text="A" {...props} />
		</ListBox>
	)
}

/** Элемент коллекции, класс его корня и строка, которой уходят атрибуты потребителя. */
const ITEMS: ReadonlyArray<readonly [string, Component<TItemProbeProps>, string, string]> = [
	['Tabs.Item', TabsItemProbe, '.so-tabs-item', '.so-tabs-item [role="tab"]'],
	['Accordion.Item', AccordionItemProbe, '.so-accordion-item', '.so-accordion-item__header'],
	['RadioGroup.Item', RadioGroupItemProbe, '.so-radio-group-item', '.so-radio-group-item__input'],
]

/** Общие пропсы полей в таблице. */
type TFieldProbeProps = CheckBoxProps & SwitchProps & InputProps

/**
 * Поле и класс его корня. Атрибуты потребителя поле делит, как у Vue: класс и
 * стиль — корню, остальное — `<input>`, поверх его набора `aria`. Корень
 * остаётся за адаптером и у него.
 */
const FIELDS: ReadonlyArray<readonly [string, Component<TFieldProbeProps>, string]> = [
	['CheckBox', CheckBox, '.so-check-box'],
	['Switch', Switch, '.so-switch'],
	['Input', Input, '.so-input'],
]

describe('атрибут снаружи перекрывает набор ядра', () => {
	/** `dir` ядро пишет в `attrs` по `direction`, а `dir` снаружи — атрибут потребителя. */
	it.each(COMPONENTS)('%s: dir потребителя — поверх dir ядра', (_name, Probe, selector, own) => {
		mount(() => <Probe {...own} direction="rtl" dir="ltr" />)

		expect(find(document, selector, HTMLElement).getAttribute('dir')).toBe('ltr')
	})

	/** Класс ядра — первым, класс потребителя — за ним, оба на корне. */
	it.each(COMPONENTS)(
		'%s: класс потребителя — после классов ядра',
		(_name, Probe, selector, own) => {
			mount(() => <Probe {...own} class="mine" />)

			const classes = [...find(document, selector, HTMLElement).classList]

			expect(classes.at(-1)).toBe('mine')
			expect(classes[0]).toBe(selector.slice(1))
		},
	)

	it('Button на div: tabindex потребителя — поверх tabindex="0" ядра', () => {
		const { root } = mount(() => <Button tag="div" tabindex={-1} />)

		expect(root().getAttribute('role')).toBe('button')
		expect(root().getAttribute('tabindex')).toBe('-1')
	})

	it('Button на div: role потребителя — поверх role="button" ядра', () => {
		const { root } = mount(() => <Button tag="div" role="link" />)

		expect(root().getAttribute('role')).toBe('link')
	})

	it('без атрибута снаружи остаётся набор ядра', () => {
		const { root } = mount(() => <Button tag="div" direction="rtl" />)

		expect(root().getAttribute('tabindex')).toBe('0')
		expect(root().getAttribute('dir')).toBe('rtl')
	})

	/** Атрибут потребителя переживает смену набора ядра: кнопку выключили и включили. */
	it('Button на div: tabindex потребителя переживает смену disabled', () => {
		const ctrl = new TButton({ tag: 'div' })
		const { root } = mount(() => <Button ctrl={ctrl} tabindex={-1} />)

		ctrl.disabled = true
		ctrl.disabled = false

		expect(root().getAttribute('tabindex')).toBe('-1')
	})
})

describe('поле: атрибуты снаружи — <input>, поверх его aria', () => {
	/** Имя полю пишет плагин доступного имени в `aria`, а `aria-label` снаружи — атрибут потребителя. */
	it.each(FIELDS)('%s: aria-label потребителя — поверх имени поля', (_name, Probe, selector) => {
		mount(() => <Probe aria_label="Ядро" aria-label="Своё" />)

		const field = find(document, `${selector} input`, HTMLInputElement)

		expect(field.getAttribute('aria-label')).toBe('Своё')
		expect(find(document, selector, HTMLElement).hasAttribute('aria-label')).toBe(false)
	})

	it.each(FIELDS)('%s: класс и стиль — корню, а не полю', (_name, Probe, selector) => {
		mount(() => <Probe class="mine" style={{ color: 'red' }} />)

		const root = find(document, selector, HTMLElement)
		const field = find(root, 'input', HTMLInputElement)

		expect([...root.classList].at(-1)).toBe('mine')
		expect(root.style.color).toBe('red')
		expect(field.hasAttribute('class')).toBe(false)
		expect(field.hasAttribute('style')).toBe(false)
	})

	/**
	 * `ref` потребителя — не «остальное»: он получает корень поля, а не
	 * `<input>`. До поля потребитель дойдёт от корня `querySelector`, а от поля
	 * до корня — только по родителям, и этот путь ломается при правке разметки.
	 */
	it.each(FIELDS)(
		'%s: ref потребителя — корень, а не <input>; element:ready — с корнем',
		async (_name, Probe, selector) => {
			const nodes: Element[] = []
			const ready: Element[] = []

			mount(() => (
				<Probe
					ref={(node) => nodes.push(node)}
					onElementReady={(node) => ready.push(node)}
				/>
			))
			await nextFrame()

			const root = find(document, selector, HTMLElement)

			expectNodes(nodes, [root])
			expect(nodes).not.toContain(find(root, 'input', HTMLInputElement))
			expectNodes(ready, [root])
		},
	)

	/**
	 * Тема красит коробку поля и подпись поля формы `Field` по корню поля —
	 * прямому ребёнку обёртки контрола, — поэтому `dataset` (`data-disabled`,
	 * `data-invalid`) — на корне, а ошибку скринридеру объявляет `<input>`.
	 * Ошибку контролу пишет поле формы.
	 */
	it.each(FIELDS)(
		'%s: data-disabled и data-invalid — на корне, aria-invalid — у <input>',
		(_name, Probe, selector) => {
			mount(() => (
				<Field invalid>
					<Probe disabled />
				</Field>
			))

			const root = find(document, selector, HTMLElement)
			const field = find(root, 'input', HTMLInputElement)

			expect(root.dataset['disabled']).toBe('true')
			expect(root.dataset['invalid']).toBe('true')
			expect(field.hasAttribute('data-disabled')).toBe(false)
			expect(field.hasAttribute('data-invalid')).toBe(false)
			expect(field.getAttribute('aria-invalid')).toBe('true')
		},
	)

	it('делёж атрибутов: класс и стиль — корню, ref — не полю, остальное — полю', () => {
		const ref = () => {}
		const forward = { class: 'mine', style: 'color: red', title: 'Подсказка', ref }

		expect(toRootForward(forward)).toEqual({ class: 'mine', style: 'color: red' })
		expect(toControlAttrs(forward)).toEqual({ title: 'Подсказка' })
	})
})

describe('элемент коллекции: атрибуты снаружи — строке, поверх её aria', () => {
	/** `id` строке пишет коллекция при входе элемента — связка с панелью. */
	it.each(ITEMS)('%s: id потребителя — поверх id коллекции', (_name, Probe, _root, row) => {
		mount(() => <Probe id="mine" />)

		expect(find(document, row, HTMLElement).id).toBe('mine')
	})

	it.each(ITEMS)('%s: класс и стиль — корню, а не строке', (_name, Probe, root, row) => {
		mount(() => <Probe class="mine" style={{ color: 'red' }} />)

		expect(find(document, root, HTMLElement).classList.contains('mine')).toBe(true)
		expect(find(document, root, HTMLElement).style.color).toBe('red')
		expect(find(document, row, HTMLElement).classList.contains('mine')).toBe(false)
	})

	/** Смена атрибута потребителя доходит до строки, корень элемента — тот же. */
	it.each(ITEMS)('%s: смена атрибута — на строке, корень тот же', (_name, Probe, root, row) => {
		const [title, setTitle] = createSignal('a')

		mount(() => <Probe title={title()} />)

		const node = find(document, root, HTMLElement)

		setTitle('b')

		expect(find(document, row, HTMLElement).getAttribute('title')).toBe('b')
		expect(find(document, root, HTMLElement)).toBe(node)
	})
})

/** Общие пропсы списков в таблице. */
type TListProbeProps = ListBoxProps & TabsProps

/**
 * Список, класс его корня и узел списка — ребёнок корня с ролью, которому
 * уходят атрибуты потребителя: на нём `aria` компонента, а корень — рамка
 * (шапка и подвал ListBox, панели Tabs).
 */
const LISTS: ReadonlyArray<readonly [string, Component<TListProbeProps>, string, string]> = [
	['ListBox', ListBox, '.so-list-box', '.so-list-box > [role="listbox"]'],
	['Tabs', Tabs, '.so-tabs', '.so-tabs > [role="tablist"]'],
]

describe('ListBox, Tabs: атрибуты снаружи — узлу списка, поверх его aria', () => {
	it.each(LISTS)(
		'%s: aria-label, id и data-* — на узле списка, а не на корне',
		(_name, List, root, list) => {
			mount(() => <List aria-label="Своё" id="mine" data-probe="1" />)

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
		mount(() => <List aria_label="Ядро" aria-label="Своё" />)

		expect(find(document, list, HTMLElement).getAttribute('aria-label')).toBe('Своё')
	})

	/** Класс ядра — первым, класс потребителя — за ним, оба на корне. */
	it.each(LISTS)('%s: класс и стиль — корню, а не узлу списка', (_name, List, root, list) => {
		mount(() => <List class="mine" style={{ color: 'red' }} />)

		const el = find(document, root, HTMLElement)
		const node = find(document, list, HTMLElement)
		const classes = [...el.classList]

		expect(classes.at(-1)).toBe('mine')
		expect(classes[0]).toBe(root.slice(1))
		expect(el.style.color).toBe('red')
		expect(node.classList.contains('mine')).toBe(false)
		expect(node.style.color).toBe('')
	})

	/** `dir` ядро пишет в `attrs` по `direction`, на корень; `dir` снаружи — узлу списка. */
	it.each(LISTS)(
		'%s: dir ядра — на корне, dir потребителя — на узле списка',
		(_name, List, root, list) => {
			mount(() => <List direction="rtl" dir="ltr" />)

			expect(find(document, root, HTMLElement).getAttribute('dir')).toBe('rtl')
			expect(find(document, list, HTMLElement).getAttribute('dir')).toBe('ltr')
		},
	)

	/** Смена атрибута потребителя доходит до узла списка, корень — тот же. */
	it.each(LISTS)(
		'%s: смена атрибута — на узле списка, корень тот же',
		(_name, List, root, list) => {
			const [title, setTitle] = createSignal('a')

			mount(() => <List title={title()} />)

			const node = find(document, root, HTMLElement)

			setTitle('b')

			expect(find(document, list, HTMLElement).getAttribute('title')).toBe('b')
			expect(find(document, root, HTMLElement)).toBe(node)
			expect(node.hasAttribute('title')).toBe(false)
		},
	)

	it.each(LISTS)('%s: обработчик потребителя — на узле списка', (_name, List, _root, list) => {
		const targets: EventTarget[] = []

		mount(() => (
			<List
				onClick={(event) => {
					targets.push(event.currentTarget)
				}}
			/>
		))

		const node = find(document, list, HTMLElement)

		node.click()

		expect(targets).toHaveLength(1)
		expect(targets[0]).toBe(node)
	})

	it('ListBox: tabindex="-1" снимает список с остановок Tab', () => {
		const { root } = mount(() => <ListBox tabindex={-1} />)

		expect(find(root(), '[role="listbox"]', HTMLElement).getAttribute('tabindex')).toBe('-1')
		expect(root().hasAttribute('tabindex')).toBe(false)
	})
})

/**
 * Корень таблицы стоит внутри окна (`div.so-table__viewport`), и окно — внешний
 * узел компонента: атрибуты потребителя, его класс, стиль и скрытие — окну, а
 * классы и наборы ядра — `table`, которую видят плагины и тема
 * (`createWrappedRootProps`).
 */
describe('Table: корень внутри окна', () => {
	it('класс, стиль и атрибуты потребителя — окну, классы и наборы ядра — table', () => {
		mount(() => (
			<TableProbe
				class="mine"
				style={{ color: 'red' }}
				title="Сотрудники"
				dir="ltr"
				direction="rtl"
				aria_label="Таблица"
			/>
		))

		const viewport = find(document, '.so-table__viewport', HTMLElement)
		const table = find(document, 'table.so-table', HTMLElement)

		expect([...viewport.classList]).toEqual(['so-table__viewport', 'mine'])
		expect(viewport.style.color).toBe('red')
		expect(viewport.title).toBe('Сотрудники')
		expect(viewport.getAttribute('dir')).toBe('ltr')
		expect(table.classList.contains('mine')).toBe(false)
		expect(table.classList[0]).toBe('so-table')
		expect(table.hasAttribute('style')).toBe(false)
		expect(table.hasAttribute('title')).toBe(false)
		// Наборы ядра — у таблицы: `dir` из `direction`, имя — из `aria_label`
		expect(table.getAttribute('dir')).toBe('rtl')
		expect(table.getAttribute('aria-label')).toBe('Таблица')
		expect(viewport.hasAttribute('aria-label')).toBe(false)
	})

	it('свойство, записанное в окно мимо разметки, переживает смену стиля потребителя и видимости', () => {
		const [style, setStyle] = createSignal<JSX.CSSProperties>({ color: 'red' })
		const [visible, setVisible] = createSignal(true)

		mount(() => <TableProbe style={style()} visible={visible()} />)

		const viewport = find(document, '.so-table__viewport', HTMLElement)

		viewport.style.setProperty('--so-probe', '1')
		setStyle({ color: 'blue' })
		setVisible(false)

		expect(viewport.style.display).toBe('none')

		setVisible(true)

		expect(viewport.style.color).toBe('blue')
		expect(viewport.style.display).toBe('')
		expect(viewport.style.getPropertyValue('--so-probe')).toBe('1')
	})
})

/** Узлы сверяются по ссылке: `toEqual` сравнил бы узлы по разметке. */
function expectNodes(actual: readonly Element[], expected: readonly Element[]): void {
	expect(actual).toHaveLength(expected.length)
	expected.forEach((node, index) => expect(actual[index]).toBe(node))
}

/** Пропсы, которые таблица `ref` отдаёт каждому компоненту: `ref` и событие привязки корня. */
type TRefProbeProps = {
	ref?: (node: Element) => void
	onElementReady?: (element: Element) => void
}

const COLUMNS: TTableColumnSource[] = [{ field: 'name', text: 'Имя', rowHeader: true }]

/** Таблица из одной строки и одной колонки. */
function TableProbe(props: TableProps): JSX.Element {
	return <Table columns={COLUMNS} items={[{ data: { id: 1, name: 'Анна' } }]} {...props} />
}

/**
 * Компонент со своим корнем — каждый, и поле и часть коллекции тоже, — как
 * его рисовать, класс узла, который получает `ref` потребителя, и класс узла,
 * с которым приходит `element:ready`. Это один узел — у всех, кроме таблицы:
 * её `ref` получает окно, внешний узел, куда ложатся атрибуты потребителя, а
 * к `TElementPlugin` привязан корень `table`. Frame по умолчанию скрыт и
 * уходит телепортом в `body` — корень ищется по документу; у Icon тега по
 * умолчанию нет; часть коллекции — в своём владельце.
 */
const ROOTS: ReadonlyArray<
	readonly [string, (props: TRefProbeProps) => JSX.Element, string, string]
> = [
	['Button', (props) => <Button {...props} />, '.so-button', '.so-button'],
	[
		'ComponentView',
		(props) => <ComponentView {...props} />,
		'.so-component-view',
		'.so-component-view',
	],
	['Frame', (props) => <Frame visible {...props} />, '.so-frame', '.so-frame'],
	['Field', (props) => <Field {...props} />, '.so-field', '.so-field'],
	['Icon', (props) => <Icon tag="i" {...props} />, '.so-icon', '.so-icon'],
	['Label', (props) => <Label {...props} />, '.so-label', '.so-label'],
	[
		'ProgressSpinner',
		(props) => <ProgressSpinner {...props} />,
		'.so-progress-spinner',
		'.so-progress-spinner',
	],
	['Skeleton', (props) => <Skeleton {...props} />, '.so-skeleton', '.so-skeleton'],
	['CheckBox', (props) => <CheckBox {...props} />, '.so-check-box', '.so-check-box'],
	['Switch', (props) => <Switch {...props} />, '.so-switch', '.so-switch'],
	['Input', (props) => <Input {...props} />, '.so-input', '.so-input'],
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
	['Table', (props) => <TableProbe {...props} />, '.so-table__viewport', 'table.so-table'],
]

/** Поля: `ref` потребителя — корень, а не `<input>`. */
const FIELD_ROOTS = ROOTS.filter(([name]) => ['RadioGroup.Item'].includes(name))

/**
 * `ref` потребителя получает корень компонента — узел, на который ложатся его
 * класс и атрибуты, — а у таблицы окно. Отдаёт его `ref` адаптера тем же
 * вызовом, после привязки к `TElementPlugin`, и привязку он не выбивает; у
 * таблицы половины `ref` разведены: окну — `ref` потребителя, `table` —
 * привязка. Как любой `ref` Solid, он зовётся, когда узел создан, и при снятии
 * узла не зовётся.
 */
describe('ref потребителя — корень компонента', () => {
	it.each(ROOTS)(
		'%s: ref — корень, element:ready — привязанный корень',
		async (_name, draw, selector, bound) => {
			const nodes: Element[] = []
			const ready: Element[] = []

			mount(() =>
				draw({
					ref: (node) => nodes.push(node),
					onElementReady: (node) => ready.push(node),
				}),
			)
			await nextFrame()

			expectNodes(nodes, [find(document, selector, HTMLElement)])
			expectNodes(ready, [find(document, bound, HTMLElement)])
		},
	)

	it.each(ROOTS)('%s: снятие узла ref не зовёт', (_name, draw, selector) => {
		const nodes: Element[] = []
		const { destroy } = mount(() => draw({ ref: (node) => nodes.push(node) }))
		const root = find(document, selector, HTMLElement)

		destroy()

		expectNodes(nodes, [root])
	})

	/** Радио — поле с корнем-`label`: `ref` — корень, а не `<input>`, как у полей выше. */
	it.each(FIELD_ROOTS)('%s: ref — корень, а не <input>', (_name, draw, selector) => {
		const nodes: Element[] = []

		mount(() => draw({ ref: (node) => nodes.push(node) }))

		const root = find(document, selector, HTMLElement)

		expectNodes(nodes, [root])
		expect(nodes).not.toContain(find(root, 'input', HTMLInputElement))
	})

	/** `ref={button}` компилятор Solid превращает в функцию, которая присвоит переменной узел. */
	it('ref={переменная} — корень, у поля тоже', () => {
		let button: Element | undefined
		let input: Element | undefined
		const { container } = mount(() => (
			<>
				<Button ref={button} />
				<Input ref={input} />
			</>
		))

		expect(button).toBe(find(container, '.so-button', HTMLElement))
		expect(input).toBe(find(container, '.so-input', HTMLElement))
	})

	/** Смена тега пересоздаёт узел: потребитель получает новый корень. */
	it('смена тега — потребителю новый корень', async () => {
		const ctrl = new TButton()
		const nodes: Element[] = []
		const { root } = mount(() => <Button ctrl={ctrl} ref={(node) => nodes.push(node)} />)
		const first = root()

		ctrl.tag = 'span'
		await nextFrame()

		expect(root()).not.toBe(first)
		expectNodes(nodes, [first, root()])
	})

	/** Смена тега пересоздаёт узел: привязка отпускает прежний и берёт новый. */
	it('смена тега — ready с новым корнем', async () => {
		const ctrl = new TButton()
		const onElementReady = vi.fn()
		const { root } = mount(() => <Button ctrl={ctrl} onElementReady={onElementReady} />)

		await nextFrame()

		const first = root()

		ctrl.tag = 'span'
		await nextFrame()

		expect(root()).not.toBe(first)
		expect(root().localName).toBe('span')
		expect(onElementReady).toHaveBeenLastCalledWith(root())
	})

	/**
	 * Атрибуты корня — мемо, и смена любого из них не трогает привязку: узел
	 * тот же, и `TElementPlugin` не объявляет его заново.
	 */
	it('смена атрибута не перепривязывает корень', async () => {
		const onElementReady = vi.fn()
		const [title, setTitle] = createSignal('a')

		mount(() => <Button title={title()} onElementReady={onElementReady} />)
		await nextFrame()

		setTitle('b')
		await nextFrame()

		expect(onElementReady).toHaveBeenCalledTimes(1)
	})
})

/**
 * Плагины пишут в узел и сами — мимо разметки: сдвиг смахиваемой панели,
 * предел высоты списка. Стиль объектом Solid ставит по свойству и чужого не
 * трогает: такое свойство переживает смену раскладки, видимости и стиля
 * потребителя.
 */
describe('свойство, записанное в узел мимо разметки', () => {
	it('переживает смену layout_styles, видимости и стиля потребителя', () => {
		const ctrl = new TButton()
		const [style, setStyle] = createSignal<JSX.CSSProperties>({ color: 'red' })
		const [width, setWidth] = createSignal(10)
		const { container } = mount(() => (
			<>
				<Button ctrl={ctrl} style={style()} />
				<Icon tag="i" width={width()} />
			</>
		))
		const button = find(container, '.so-button', HTMLElement)
		const icon = find(container, '.so-icon', HTMLElement)

		button.style.setProperty('--so-swipe-offset', '12px')
		icon.style.setProperty('--so-swipe-offset', '7px')

		ctrl.hide()
		ctrl.show()
		setStyle({ color: 'blue' })
		setWidth(20)

		expect(button.style.getPropertyValue('--so-swipe-offset')).toBe('12px')
		expect(button.style.color).toBe('blue')
		expect(icon.style.getPropertyValue('--so-swipe-offset')).toBe('7px')
		expect(icon.style.width).toBe('20px')
	})

	it('снятый стиль потребителя снимает своё, а чужого не трогает', () => {
		const [style, setStyle] = createSignal<JSX.CSSProperties | undefined>({ color: 'red' })
		const { root } = mount(() => <Button style={style()} />)

		root().style.setProperty('--so-swipe-offset', '12px')
		setStyle(undefined)

		expect(root().style.color).toBe('')
		expect(root().style.getPropertyValue('--so-swipe-offset')).toBe('12px')
	})
})

/**
 * Стиль Solid ставит объектом с именами как в CSS — так их и пишут плагины и
 * ядро: пользовательское свойство остаётся под своим именем, `z-index` — тоже.
 * Так размер отдают плагины раскладки окна и выезжающей панели, но этих
 * компонентов в Solid пока нет, и правило проверяется на самой раскладке
 * корня.
 */
describe('раскладка корня: имена стиля — как в CSS', () => {
	it('--* из layout_styles доходит до узла как есть', () => {
		const layout = toRootLayout({ layout_styles: { '--so-dialog-width': '320px' } }, {})

		expect(layout.style).toEqual({ '--so-dialog-width': '320px' })
	})

	it('пустое значение свойства не задаёт, пустой стиль — пустой объект', () => {
		expect(toRootLayout({ layout_styles: { width: '', height: '' } }, {}).style).toEqual({})
		expect(toRootLayout({ layout_styles: { width: '', height: '2em' } }, {}).style).toEqual({
			height: '2em',
		})
	})

	it('стиль потребителя строкой — слои склеены текстом, скрытие — последним', () => {
		const layout = toRootLayout(
			{ layout_styles: { 'z-index': 3 }, visible: false },
			{ style: 'display: flex' },
		)

		expect(layout.style).toBe('z-index: 3; display: flex; display: none')
	})

	it('наборы ядра — первыми, атрибуты потребителя — поверх', () => {
		const props = toRootProps(
			{ classes: ['so-x'] },
			[{ role: 'button', tabindex: '0' }, { 'data-open': 'true' }],
			{ class: 'mine', style: { color: 'red' } },
		)
		// Пропсы, которые компонент не съел, — всё, что пришло от потребителя
		const forward: Record<string, unknown> = { tabindex: -1, class: 'mine' }

		expect(props).toMatchObject({ role: 'button', tabindex: '0', 'data-open': 'true' })
		expect(toRootProps({}, [{ tabindex: '0' }], forward).tabindex).toBe(-1)
		expect(props.class).toBe('so-x mine')
		expect(props.style).toEqual({ color: 'red' })
	})
})

/**
 * Стиль-выход компонента — стиль, который считает ядро: доля кольца
 * (`fractionStyle`). Раскладка корня кладёт его поверх стиля плагина, под
 * стилем потребителя — как во Vue, где атрибуты снаружи ложатся на корень
 * последними, — и под `display: none` скрытого корня, как у `v-show`.
 */
describe('раскладка корня: стиль-выход компонента', () => {
	it('ProgressSpinner: стиль потребителя — поверх доли', () => {
		const { root } = mount(() => (
			<ProgressSpinner value={40} style={{ '--so-progress-spinner-fraction': '0.9' }} />
		))

		expect(root().style.getPropertyValue('--so-progress-spinner-fraction')).toBe('0.9')
	})

	it('ProgressSpinner: display: none скрытого корня — поверх стиля потребителя и доли', () => {
		const { root } = mount(() => (
			<ProgressSpinner value={40} visible={false} style={{ display: 'inline-block' }} />
		))

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

		expect(layout.style).toEqual({ '--ring': 'own', 'z-index': 3 })
	})
})
