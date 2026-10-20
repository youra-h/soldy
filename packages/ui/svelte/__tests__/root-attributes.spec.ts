/**
 * Порядок атрибутов корня — один у всех компонентов (`toRootProps`).
 *
 * Наборы ядра (`attrs`, `aria`, `dataset`) ложатся первыми, атрибуты снаружи —
 * поверх них, как у Vue, где атрибуты снаружи падают на корень последними.
 * Раньше компоненты Svelte разворачивали атрибуты потребителя первыми, и набор
 * ядра их перекрывал: `tabindex="-1"` строки списка проиграл бы
 * `tabindex="0"`, который кнопка на `div` ставит себе сама, — строки списка
 * стали бы остановками Tab.
 *
 * Привязку корня к `TElementPlugin` ставит не атрибут, а attachment корня
 * (`Dynamic`): `element:ready` приходит с корнем у каждого компонента.
 *
 * Attachment потребителя (`<Button {@attach tooltip}>`) Svelte передаёт
 * компоненту пропом с ключом-символом, и на корень он едет вместе с
 * атрибутами потребителя. У привязки корня адаптера ключ свой: одно другого
 * не перекрывает.
 *
 * Элемент коллекции (`Tabs.Item`, `Accordion.Item`, `RadioGroup.Item`) делит
 * атрибуты потребителя, как у Vue: класс и стиль — корню, остальное — строке
 * (у радио — полю), поверх её набора `aria`. Корень остаётся за адаптером и у
 * него. ListBox и Tabs делят их так же: остальное — узлу списка с ролью
 * (`listbox`, `tablist`), поверх его `aria`.
 *
 * Корень таблицы стоит внутри окна: класс, стиль и `ref` потребителя — окну,
 * внешнему узлу, а остальные атрибуты и attachment-ы потребителя, наборы ядра
 * и привязка к `TElementPlugin` — `table`.
 */

import { describe, it, expect } from 'vitest'
import { flushSync, type Component, type ComponentProps } from 'svelte'
import { createAttachmentKey, type Attachment } from 'svelte/attachments'
import {
	TButton,
	TCheckBox,
	TInput,
	TNumberInput,
	TSwitch,
	TTextarea,
	createEngineTable,
	type TTableCollection,
} from '@soldy-ui/core'
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
	NumberInput,
	Pagination,
	ProgressLinear,
	ProgressSpinner,
	RadioGroup,
	Rating,
	Scroller,
	Skeleton,
	Slider,
	Switch,
	Table,
	Tabs,
	Textarea,
	roleIcon,
	toControlAttrs,
	toRootForward,
	toRootLayout,
	toRootProps,
	toWrappedRootProps,
	type AccordionProps,
	type ButtonProps,
	type CheckBoxProps,
	type ComponentViewProps,
	type FieldProps,
	type FrameProps,
	type IconProps,
	type InputProps,
	type LabelProps,
	type ListBoxProps,
	type NumberInputProps,
	type PaginationProps,
	type ProgressLinearProps,
	type ProgressSpinnerProps,
	type RadioGroupProps,
	type RatingProps,
	type ScrollerProps,
	type SkeletonProps,
	type SliderProps,
	type SwitchProps,
	type TableProps,
	type TabsContentProps,
	type TabsProps,
	type TextareaProps,
} from '@soldy-ui/svelte'
import Attach from './Attach.test.svelte'
import BindRef from './BindRef.test.svelte'
import ItemProbe from './ItemProbe.test.svelte'
import Link from './Link.test.svelte'
import RootRef, { type TRootKind } from './RootRef.test.svelte'
import { find, mount, nextFrame, readyProbe, type TMounted } from './mount'
import { reactiveProps } from './reactive-props.svelte'
import { attachRootStyle } from './root-style.svelte'

/** Общие пропсы строки таблицы: направление, атрибуты и колбэк готовности есть у всех. */
type TProbeProps = ButtonProps &
	ComponentViewProps &
	FieldProps &
	FrameProps &
	IconProps &
	LabelProps &
	ProgressSpinnerProps &
	ProgressLinearProps &
	SkeletonProps &
	TabsProps &
	AccordionProps &
	RadioGroupProps &
	TabsContentProps &
	SliderProps &
	RatingProps &
	ScrollerProps &
	PaginationProps

/**
 * Компонент, как его рисовать, и класс его корня. Пропсы, без которых корень
 * не виден, рисование добавляет само: Frame по умолчанию скрыт и уходит
 * телепортом в `body` — корень ищется по документу; у Icon тега по умолчанию
 * нет; панель рисуется, пока активен её таб, — и только внутри набора.
 * Оценка, ползунок, лента и пагинация атрибуты потребителя не делят: полей у
 * оценки и ползунка столько, сколько ручек, а указатель поле не ловит, — и
 * всё ложится на корень.
 */
const COMPONENTS: ReadonlyArray<readonly [string, (props: TProbeProps) => TMounted, string]> = [
	['Button', (props) => mount(Button, props), '.so-button'],
	['ComponentView', (props) => mount(ComponentView, props), '.so-component-view'],
	['Field', (props) => mount(Field, props), '.so-field'],
	['Frame', (props) => mount(Frame, { visible: true, ...props }), '.so-frame'],
	['Icon', (props) => mount(Icon, { tag: 'i', ...props }), '.so-icon'],
	['Label', (props) => mount(Label, props), '.so-label'],
	['ProgressSpinner', (props) => mount(ProgressSpinner, props), '.so-progress-spinner'],
	['ProgressLinear', (props) => mount(ProgressLinear, props), '.so-progress-linear'],
	['Skeleton', (props) => mount(Skeleton, props), '.so-skeleton'],
	['Tabs.Content', (props) => mount(ItemProbe, { kind: 'content', ...props }), '.so-tabs__panel'],
	['Accordion', (props) => mount(Accordion, props), '.so-accordion'],
	['RadioGroup', (props) => mount(RadioGroup, props), '.so-radio-group'],
	['Slider', (props) => mount(Slider, props), '.so-slider'],
	['Rating', (props) => mount(Rating, props), '.so-rating'],
	['Scroller', (props) => mount(Scroller, props), '.so-scroller'],
	['Pagination', (props) => mount(Pagination, { total: 30, ...props }), '.so-pagination'],
]

/** Общие пропсы полей в таблице. */
type TFieldProbeProps = CheckBoxProps & SwitchProps & InputProps & NumberInputProps & TextareaProps

/**
 * Поле и класс его корня. Атрибуты потребителя поле делит, как у Vue: класс и
 * стиль — корню, остальное — `<input>` (у Textarea — `<textarea>`, у
 * NumberInput — ввод), поверх его набора `aria`. Корень остаётся за адаптером
 * и у него.
 */
const FIELDS: ReadonlyArray<readonly [string, Component<TFieldProbeProps>, string]> = [
	['CheckBox', CheckBox, '.so-check-box'],
	['Switch', Switch, '.so-switch'],
	['Input', Input, '.so-input'],
	['NumberInput', NumberInput, '.so-number-input'],
	['Textarea', Textarea, '.so-textarea'],
]

/**
 * Поле внутри корня: `<input>`, у Textarea — `<textarea>`, у NumberInput —
 * первый `<input>`, ввод: скрытое поле формы стоит последним.
 */
const CONTROL = 'input, textarea'

/** Контрол с ошибкой: её задают инстансу — в разметке её задаёт поле формы. */
function invalid<T extends { invalid: boolean }>(ctrl: T): T {
	ctrl.invalid = true

	return ctrl
}

/** Поле, выключенное и с ошибкой, и класс его корня. */
const INVALID_FIELDS: ReadonlyArray<readonly [string, () => TMounted, string]> = [
	[
		'CheckBox',
		() => mount(CheckBox, { ctrl: invalid(new TCheckBox({ disabled: true })) }),
		'.so-check-box',
	],
	[
		'Switch',
		() => mount(Switch, { ctrl: invalid(new TSwitch({ disabled: true })) }),
		'.so-switch',
	],
	['Input', () => mount(Input, { ctrl: invalid(new TInput({ disabled: true })) }), '.so-input'],
	[
		'NumberInput',
		() => mount(NumberInput, { ctrl: invalid(new TNumberInput({ disabled: true })) }),
		'.so-number-input',
	],
	[
		'Textarea',
		() => mount(Textarea, { ctrl: invalid(new TTextarea({ disabled: true })) }),
		'.so-textarea',
	],
]

/** Рисование элемента коллекции в своём владельце — пропсами самого элемента. */
type TItemDraw = (props: Record<string | symbol, unknown>) => TMounted

/**
 * Элемент коллекции, как его рисовать, класс его корня и строка, которой уходят
 * атрибуты потребителя: у радио строки нет, и атрибуты уходят полю. Элемент —
 * в своём владельце: `id` строке пишет коллекция.
 */
const ITEMS: ReadonlyArray<readonly [string, TItemDraw, string, string]> = [
	[
		'Tabs.Item',
		(props) => mount(ItemProbe, { kind: 'tabs', ...props }),
		'.so-tabs-item',
		'.so-tabs-item [role="tab"]',
	],
	[
		'Accordion.Item',
		(props) => mount(ItemProbe, { kind: 'accordion', ...props }),
		'.so-accordion-item',
		'.so-accordion-item__header',
	],
	[
		'RadioGroup.Item',
		(props) => mount(ItemProbe, { kind: 'radio', ...props }),
		'.so-radio-group-item',
		'.so-radio-group-item__input',
	],
]

describe('атрибут снаружи перекрывает набор ядра', () => {
	/** `dir` ядро пишет в `attrs` по `direction`, а `dir` снаружи — атрибут потребителя. */
	it.each(COMPONENTS)('%s: dir потребителя — поверх dir ядра', (_name, draw, selector) => {
		draw({ direction: 'rtl', dir: 'ltr' })

		expect(find(document, selector, HTMLElement).getAttribute('dir')).toBe('ltr')
	})

	/** Класс ядра — первым, класс потребителя — за ним, оба на корне. */
	it.each(COMPONENTS)('%s: класс потребителя — после классов ядра', (_name, draw, selector) => {
		draw({ class: 'mine' })

		const classes = [...find(document, selector, HTMLElement).classList]

		expect(classes.at(-1)).toBe('mine')
		expect(classes[0]).toBe(selector.slice(1))
	})

	it('Button на div: tabindex потребителя — поверх tabindex="0" ядра', () => {
		const { root } = mount(Button, { tag: 'div', tabindex: -1 })

		expect(root().getAttribute('role')).toBe('button')
		expect(root().getAttribute('tabindex')).toBe('-1')
	})

	it('Button на div: role потребителя — поверх role="button" ядра', () => {
		const { root } = mount(Button, { tag: 'div', role: 'link' })

		expect(root().getAttribute('role')).toBe('link')
	})

	it('без атрибута снаружи остаётся набор ядра', () => {
		const { root } = mount(Button, { tag: 'div', direction: 'rtl' })

		expect(root().getAttribute('tabindex')).toBe('0')
		expect(root().getAttribute('dir')).toBe('rtl')
	})
})

describe('поле: атрибуты снаружи — полю, поверх его aria', () => {
	/** Имя полю пишет плагин доступного имени в `aria`, а `aria-label` снаружи — атрибут потребителя. */
	it.each(FIELDS)(
		'%s: aria-label потребителя — поверх имени поля',
		(_name, component, selector) => {
			mount(component, { aria_label: 'Ядро', 'aria-label': 'Своё' })

			const field = find(find(document, selector, HTMLElement), CONTROL, HTMLElement)

			expect(field.getAttribute('aria-label')).toBe('Своё')
			expect(find(document, selector, HTMLElement).hasAttribute('aria-label')).toBe(false)
		},
	)

	/** Свой класс у поля бывает — ввод NumberInput: по нему ввод находят плагины. */
	it.each(FIELDS)('%s: класс и стиль — корню, а не полю', (_name, component, selector) => {
		mount(component, { class: 'mine', style: 'color: red' })

		const root = find(document, selector, HTMLElement)
		const field = find(root, CONTROL, HTMLElement)

		expect([...root.classList].at(-1)).toBe('mine')
		expect(root.style.color).toBe('red')
		expect(field.classList.contains('mine')).toBe(false)
		expect(field.hasAttribute('style')).toBe(false)
	})

	/**
	 * Attachment потребителя — тоже «остальное»: поведение, которое он вешает
	 * на поле, встаёт на `<input>` или `<textarea>`. Привязка корня к
	 * `TElementPlugin` — за адаптером: `element:ready` приходит с корнем.
	 */
	it.each(FIELDS)(
		'%s: attachment потребителя — на поле, element:ready — с корнем',
		async (_name, component, selector) => {
			const consumer = attachmentProbe()
			const ready = readyProbe()

			mount(component, {
				onElementReady: ready.onElementReady,
				[createAttachmentKey()]: consumer.attach,
			})
			await nextFrame()

			const root = find(document, selector, HTMLElement)

			expect(consumer.attached).toHaveLength(1)
			expect(consumer.attached[0]).toBe(find(root, CONTROL, HTMLElement))
			expect(ready.elements).toHaveLength(1)
			expect(ready.elements[0]).toBe(root)
		},
	)

	/**
	 * Тема красит коробку поля и подпись поля формы `Field` по корню поля —
	 * прямому ребёнку обёртки контрола, — поэтому `dataset` (`data-disabled`,
	 * `data-invalid`) — на корне, а ошибку скринридеру объявляет поле.
	 */
	it.each(INVALID_FIELDS)(
		'%s: data-disabled и data-invalid — на корне, aria-invalid — у поля',
		(_name, draw, selector) => {
			draw()

			const root = find(document, selector, HTMLElement)
			const field = find(root, CONTROL, HTMLElement)

			expect(root.dataset['disabled']).toBe('true')
			expect(root.dataset['invalid']).toBe('true')
			expect(field.hasAttribute('data-disabled')).toBe(false)
			expect(field.hasAttribute('data-invalid')).toBe(false)
			expect(field.getAttribute('aria-invalid')).toBe('true')
		},
	)

	it('делёж атрибутов: класс и стиль — корню, остальное — полю', () => {
		const key = createAttachmentKey()
		const attach = () => {}
		const forward = { class: 'mine', style: 'color: red', title: 'Подсказка', [key]: attach }

		expect(toRootForward(forward)).toEqual({ class: 'mine', style: 'color: red' })
		expect(toControlAttrs(forward)).toEqual({ title: 'Подсказка', [key]: attach })
	})
})

describe('элемент коллекции: атрибуты снаружи — строке, поверх её aria', () => {
	/** `id` строке пишет коллекция при входе элемента — связка с панелью. */
	it.each(ITEMS)('%s: id потребителя — поверх id коллекции', (_name, draw, _root, row) => {
		draw({ id: 'mine' })

		expect(find(document, row, HTMLElement).id).toBe('mine')
	})

	it.each(ITEMS)('%s: класс и стиль — корню, а не строке', (_name, draw, root, row) => {
		draw({ class: 'mine', style: 'color: red' })

		expect(find(document, root, HTMLElement).classList.contains('mine')).toBe(true)
		expect(find(document, root, HTMLElement).style.color).toBe('red')
		expect(find(document, row, HTMLElement).classList.contains('mine')).toBe(false)
	})

	/**
	 * Attachment потребителя — тоже «остальное»: поведение, которое он вешает
	 * на элемент, встаёт на строку, у радио — на поле. Привязка корня к
	 * `TElementPlugin` — за адаптером: `element:ready` приходит с корнем элемента.
	 */
	it.each(ITEMS)(
		'%s: attachment потребителя — на строке, element:ready — с корнем',
		async (_name, draw, root, row) => {
			const consumer = attachmentProbe()
			const ready = readyProbe()

			draw({ onElementReady: ready.onElementReady, [createAttachmentKey()]: consumer.attach })
			await nextFrame()

			expect(consumer.attached).toHaveLength(1)
			expect(consumer.attached[0]).toBe(find(document, row, HTMLElement))
			expect(ready.elements).toHaveLength(1)
			expect(ready.elements[0]).toBe(find(document, root, HTMLElement))
		},
	)
})

/** Общие пропсы списков в таблице. */
type TListProbeProps = ListBoxProps & TabsProps

/**
 * Список, как его рисовать, класс его корня и узел списка — ребёнок корня с
 * ролью, которому уходят атрибуты потребителя: на нём `aria` компонента, а
 * корень — рамка (шапка и подвал ListBox, панели Tabs).
 */
const LISTS: ReadonlyArray<
	readonly [string, (props: TListProbeProps) => TMounted, string, string]
> = [
	[
		'ListBox',
		(props) => mount(ListBox, props),
		'.so-list-box',
		'.so-list-box > [role="listbox"]',
	],
	['Tabs', (props) => mount(Tabs, props), '.so-tabs', '.so-tabs > [role="tablist"]'],
]

describe('ListBox, Tabs: атрибуты снаружи — узлу списка, поверх его aria', () => {
	it.each(LISTS)(
		'%s: aria-label, id и data-* — на узле списка, а не на корне',
		(_name, draw, root, list) => {
			draw({ 'aria-label': 'Своё', id: 'mine', 'data-probe': '1' })

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
	it.each(LISTS)('%s: aria-label потребителя — поверх aria_label', (_name, draw, _root, list) => {
		draw({ aria_label: 'Ядро', 'aria-label': 'Своё' })

		expect(find(document, list, HTMLElement).getAttribute('aria-label')).toBe('Своё')
	})

	/** Класс ядра — первым, класс потребителя — за ним, оба на корне. */
	it.each(LISTS)('%s: класс и стиль — корню, а не узлу списка', (_name, draw, root, list) => {
		draw({ class: 'mine', style: 'color: red' })

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
		(_name, draw, root, list) => {
			draw({ direction: 'rtl', dir: 'ltr' })

			expect(find(document, root, HTMLElement).getAttribute('dir')).toBe('rtl')
			expect(find(document, list, HTMLElement).getAttribute('dir')).toBe('ltr')
		},
	)

	/**
	 * Attachment потребителя — тоже «остальное»: поведение, которое он вешает
	 * на список, встаёт на узел списка. Привязка корня к `TElementPlugin` — за
	 * адаптером: `element:ready` приходит с корнем.
	 */
	it.each(LISTS)(
		'%s: attachment потребителя — на узле списка, element:ready — с корнем',
		async (_name, draw, root, list) => {
			const consumer = attachmentProbe()
			const ready = readyProbe()

			draw({ onElementReady: ready.onElementReady, [createAttachmentKey()]: consumer.attach })
			await nextFrame()

			expect(consumer.attached).toHaveLength(1)
			expect(consumer.attached[0]).toBe(find(document, list, HTMLElement))
			expect(ready.elements).toHaveLength(1)
			expect(ready.elements[0]).toBe(find(document, root, HTMLElement))
		},
	)

	it.each(LISTS)('%s: обработчик потребителя — на узле списка', (_name, draw, _root, list) => {
		const targets: (EventTarget | null)[] = []

		draw({
			onclick: (event: MouseEvent) => {
				targets.push(event.currentTarget)
			},
		})

		const node = find(document, list, HTMLElement)

		node.click()

		expect(targets).toHaveLength(1)
		expect(targets[0]).toBe(node)
	})

	it('ListBox: tabindex="-1" снимает список с остановок Tab', () => {
		const { root } = mount(ListBox, { tabindex: -1 })

		expect(find(root(), '[role="listbox"]', HTMLElement).getAttribute('tabindex')).toBe('-1')
		expect(root().hasAttribute('tabindex')).toBe(false)
	})
})

/** Таблица из одной строки и одной колонки — движком: пропсы у теста реактивные. */
function tableEngine(): TTableCollection {
	const engine = createEngineTable({ items: [{ data: { id: 1, name: 'Анна' } }] })

	engine.extensions.columns.columns = [{ field: 'name', text: 'Имя', rowHeader: true }]

	return engine
}

/**
 * Корень таблицы стоит внутри окна (`div.so-table__viewport`), и атрибуты
 * потребителя делятся, как у поля (`toWrappedRootProps`): класс, стиль и
 * скрытие — окну, внешнему узлу компонента, остальное и attachment-ы —
 * `table`, поверх её наборов, где роль и имя таблицы.
 */
describe('Table: корень внутри окна', () => {
	it('класс и стиль потребителя — окну, остальные атрибуты, классы и наборы ядра — table', () => {
		mount(Table, {
			engine: tableEngine(),
			class: 'mine',
			style: 'color: red',
			title: 'Сотрудники',
			id: 'staff',
			'data-probe': '1',
			direction: 'rtl',
			aria_label: 'Таблица',
		})

		const viewport = find(document, '.so-table__viewport', HTMLElement)
		const table = find(document, 'table.so-table', HTMLElement)

		expect([...viewport.classList]).toEqual(['so-table__viewport', 'mine'])
		expect(viewport.style.color).toBe('red')
		expect(table.classList.contains('mine')).toBe(false)
		expect(table.classList[0]).toBe('so-table')
		expect(table.hasAttribute('style')).toBe(false)
		expect(table.title).toBe('Сотрудники')
		expect(table.id).toBe('staff')
		expect(table.dataset['probe']).toBe('1')
		expect(
			['title', 'id', 'data-probe', 'dir', 'aria-label'].filter((name) =>
				viewport.hasAttribute(name),
			),
		).toEqual([])
		// Наборы ядра — у таблицы: `dir` из `direction`, имя — из `aria_label`
		expect(table.getAttribute('dir')).toBe('rtl')
		expect(table.getAttribute('aria-label')).toBe('Таблица')
	})

	/** Имя пишет плагин доступного имени в `aria` таблицы, `dir` ядро — в её `attrs`. */
	it('aria-label и dir потребителя — поверх aria_label и dir ядра', () => {
		mount(Table, {
			engine: tableEngine(),
			aria_label: 'Ядро',
			'aria-label': 'Своё',
			direction: 'rtl',
			dir: 'ltr',
		})

		const table = find(document, 'table.so-table', HTMLElement)

		expect(table.getAttribute('aria-label')).toBe('Своё')
		expect(table.getAttribute('dir')).toBe('ltr')
		expect(find(document, '.so-table__viewport', HTMLElement).hasAttribute('dir')).toBe(false)
	})

	it('обработчик потребителя — на table', () => {
		const targets: (EventTarget | null)[] = []

		mount(Table, {
			engine: tableEngine(),
			onclick: (event: MouseEvent) => {
				targets.push(event.currentTarget)
			},
		})

		const table = find(document, 'table.so-table', HTMLElement)

		table.click()

		expect(targets).toHaveLength(1)
		expect(targets[0]).toBe(table)
	})

	/**
	 * Attachment потребителя — тоже «остальное», как у поля: поведение, которое
	 * он вешает на таблицу, встаёт на `table`. Привязка корня к `TElementPlugin`
	 * — за адаптером: `element:ready` приходит с `table`.
	 */
	it('attachment потребителя — на table, element:ready — с table', async () => {
		const consumer = attachmentProbe()
		const ready = readyProbe()

		mount(Table, {
			engine: tableEngine(),
			onElementReady: ready.onElementReady,
			[createAttachmentKey()]: consumer.attach,
		})
		await nextFrame()

		expect(consumer.attached).toHaveLength(1)
		expect(consumer.attached[0]).toBe(find(document, 'table.so-table', HTMLElement))
		expect(ready.elements).toHaveLength(1)
		expect(ready.elements[0]).toBe(find(document, 'table.so-table', HTMLElement))
	})

	it('делёж атрибутов окна: класс и стиль — окну, остальное и attachment-ы — корню', () => {
		const attach = createAttachmentKey()
		const consumer = attachmentProbe()
		const forward = {
			class: 'mine',
			style: 'color: red',
			'aria-label': 'Своё',
			[attach]: consumer.attach,
		}
		const { wrapper, root } = toWrappedRootProps(
			{ classes: ['so-table'], visible: false },
			[{ 'aria-label': 'Ядро', role: 'grid' }],
			forward,
			'so-table__viewport',
		)

		expect(wrapper.class).toEqual(['so-table__viewport', 'mine'])
		expect(wrapper.style).toEqual({
			below: {},
			forward: 'color: red',
			above: { display: 'none' },
		})
		expect(Object.getOwnPropertySymbols(wrapper)).toEqual([])
		expect(root['aria-label']).toBe('Своё')
		expect(root['role']).toBe('grid')
		expect(root.class).toEqual(['so-table', undefined])
		expect(root.style).toEqual({ below: {}, forward: undefined, above: {} })
		expect(Reflect.get(root, attach)).toBe(consumer.attach)
	})

	it('свойство, записанное в окно мимо разметки, переживает смену стиля потребителя и видимости', () => {
		const props = reactiveProps<TableProps>({ engine: tableEngine(), style: 'color: red' })

		mount(Table, props)

		const viewport = find(document, '.so-table__viewport', HTMLElement)

		viewport.style.setProperty('--so-probe', '1')
		props.style = 'color: blue'
		props.visible = false
		flushSync()

		expect(viewport.style.display).toBe('none')

		props.visible = true
		flushSync()

		expect(viewport.style.color).toBe('blue')
		expect(viewport.style.display).toBe('')
		expect(viewport.style.getPropertyValue('--so-probe')).toBe('1')
	})
})

describe('привязка корня к TElementPlugin', () => {
	it.each(COMPONENTS)('%s: element:ready приходит с корнем', async (_name, draw, selector) => {
		const ready = readyProbe()

		draw({ onElementReady: ready.onElementReady })
		await nextFrame()

		expect(ready.elements).toHaveLength(1)
		expect(ready.elements[0]).toBe(find(document, selector, HTMLElement))
	})

	/** Смена тега пересоздаёт узел: привязка отпускает прежний и берёт новый. */
	it('смена тега — ready с новым корнем', async () => {
		const ctrl = new TButton()
		const ready = readyProbe()
		const { root } = mount(Button, { ctrl, onElementReady: ready.onElementReady })

		await nextFrame()

		const first = root()

		ctrl.tag = 'span'
		flushSync()
		await nextFrame()

		expect(root()).not.toBe(first)
		expect(root().localName).toBe('span')
		expect(ready.elements.at(-1)).toBe(root())
	})
})

/**
 * Компонент со своим корнем — каждый, и часть коллекции тоже, — класс узла,
 * который получает связываемый `ref`, и класс узла, с которым приходит
 * `element:ready`. Это один узел — корень, у поля и элемента коллекции тоже
 * корень, а не `<input>` и не строка, — у всех, кроме таблицы: её `ref`
 * получает окно, внешний узел, куда ложатся атрибуты потребителя, а к
 * `TElementPlugin` привязан корень `table`.
 */
const ROOTS: ReadonlyArray<readonly [TRootKind, string, string]> = [
	['Button', '.so-button', '.so-button'],
	['ComponentView', '.so-component-view', '.so-component-view'],
	['Field', '.so-field', '.so-field'],
	['Frame', '.so-frame', '.so-frame'],
	['Icon', '.so-icon', '.so-icon'],
	['Label', '.so-label', '.so-label'],
	['ProgressSpinner', '.so-progress-spinner', '.so-progress-spinner'],
	['ProgressLinear', '.so-progress-linear', '.so-progress-linear'],
	['Skeleton', '.so-skeleton', '.so-skeleton'],
	['Input', '.so-input', '.so-input'],
	['NumberInput', '.so-number-input', '.so-number-input'],
	['Textarea', '.so-textarea', '.so-textarea'],
	['CheckBox', '.so-check-box', '.so-check-box'],
	['Switch', '.so-switch', '.so-switch'],
	['Slider', '.so-slider', '.so-slider'],
	['Rating', '.so-rating', '.so-rating'],
	['Tabs', '.so-tabs', '.so-tabs'],
	['Tabs.Item', '.so-tabs-item', '.so-tabs-item'],
	['Tabs.Content', '.so-tabs__panel', '.so-tabs__panel'],
	['Accordion', '.so-accordion', '.so-accordion'],
	['Accordion.Item', '.so-accordion-item', '.so-accordion-item'],
	['RadioGroup', '.so-radio-group', '.so-radio-group'],
	['RadioGroup.Item', '.so-radio-group-item', '.so-radio-group-item'],
	['ListBox', '.so-list-box', '.so-list-box'],
	['ListBox.Item', '.so-list-box-item', '.so-list-box-item'],
	['Table', '.so-table__viewport', 'table.so-table'],
	['Scroller', '.so-scroller', '.so-scroller'],
	['Pagination', '.so-pagination', '.so-pagination'],
]

/** Поля: `ref` — корень, а не `<input>` или `<textarea>`. */
const FIELD_ROOTS = ROOTS.filter(([kind]) =>
	['Input', 'NumberInput', 'Textarea', 'CheckBox', 'Switch', 'RadioGroup.Item'].includes(kind),
)

/** Записи `ref` компонентом — по порядку; узлы сверяют по ссылке, как у `readyProbe`. */
type TRefProbe = {
	readonly onRef: (node: Element | null) => void
	readonly nodes: readonly (Element | null)[]
}

function refProbe(): TRefProbe {
	const nodes: (Element | null)[] = []

	return {
		nodes,
		onRef: (node) => {
			nodes.push(node)
		},
	}
}

function expectNodes(
	actual: readonly (Element | null)[],
	expected: readonly (Element | null)[],
): void {
	expect(actual).toHaveLength(expected.length)
	expected.forEach((node, index) => expect(actual[index]).toBe(node))
}

/**
 * Корень компонента потребитель берёт связываемым пропом — `bind:ref`:
 * `bind:this` у компонента Svelte даёт экземпляр, а не узел. Узел `ref`
 * получает тот же attachment корня, что привязывает его к `TElementPlugin`, —
 * после привязки, и привязку не выбивает; при снятии — `null`. У таблицы
 * половины attachment-а разведены: окну — запись `ref`, `table` — привязка.
 */
describe('ref потребителя — корень компонента', () => {
	it.each(ROOTS)(
		'%s: bind:ref — корень, element:ready — привязанный корень',
		async (kind, selector, bound) => {
			const probe = refProbe()
			const ready = readyProbe()

			mount(RootRef, { kind, onRef: probe.onRef, onElementReady: ready.onElementReady })
			await nextFrame()

			expectNodes(probe.nodes, [find(document, selector, Element)])
			expect(ready.elements).toHaveLength(1)
			expect(ready.elements[0]).toBe(find(document, bound, Element))
		},
	)

	it.each(ROOTS)('%s: снятие — null', (kind, selector) => {
		const probe = refProbe()
		const props = reactiveProps<ComponentProps<typeof RootRef>>({
			kind,
			shown: true,
			onRef: probe.onRef,
		})

		mount(RootRef, props)

		const root = find(document, selector, Element)

		props.shown = false
		flushSync()

		expectNodes(probe.nodes, [root, null])
	})

	it.each(FIELD_ROOTS)('%s: ref — корень, а не поле', (kind, selector) => {
		const probe = refProbe()

		mount(RootRef, { kind, onRef: probe.onRef })

		const root = find(document, selector, Element)

		expectNodes(probe.nodes, [root])
		expect(probe.nodes).not.toContain(find(root, CONTROL, HTMLElement))
	})

	/** Смена тега пересоздаёт узел: прежний корень `ref` отпускает, новый получает. */
	it('смена тега — ref получает новый корень', async () => {
		const ctrl = new TButton()
		const probe = refProbe()
		const ready = readyProbe()
		const { root } = mount(RootRef, {
			kind: 'Button',
			ctrl,
			onRef: probe.onRef,
			onElementReady: ready.onElementReady,
		})
		const first = root()

		ctrl.tag = 'span'
		flushSync()
		await nextFrame()

		expect(root()).not.toBe(first)
		expectNodes(probe.nodes, [first, null, root()])
		expect(ready.elements.at(-1)).toBe(root())
	})

	/**
	 * Так держит корень потребитель: своей переменной, `bind:ref={button}`.
	 * Пустая переменная (`$state()`, а не `null`) связывается так же: запасного
	 * значения у `ref` нет, и Svelte не падает на `props_invalid_value`.
	 */
	it('bind:ref={переменная} — корень, у поля тоже; пустая переменная — тоже', () => {
		const refs: (readonly [Element | null | undefined, Element | null | undefined])[] = []
		const { container } = mount(BindRef, {
			onRefs: (button, input) => {
				refs.push([button, input])
			},
		})
		const [button, input] = refs.at(-1) ?? [null, null]

		expect(button).toBe(find(container, '.so-button', HTMLButtonElement))
		expect(input).toBe(find(container, '.so-input', HTMLElement))
	})

	/**
	 * Сеттер привязки — код потребителя, и он вправе читать своё состояние.
	 * Смена прочитанного корень не перепривязывает: ни `removed`, ни нового
	 * `ready`, ни новой записи `ref`.
	 */
	it('сеттер bind:ref читает состояние — его смена корень не перепривязывает', async () => {
		const writes: (readonly [number, Element | null | undefined])[] = []
		const events: string[] = []
		const props = reactiveProps<ComponentProps<typeof BindRef>>({
			onRefs: () => {},
			tick: 0,
			onWrite: (tick, node) => {
				writes.push([tick, node])
			},
			onElementReady: () => {
				events.push('ready')
			},
			onElementRemoved: () => {
				events.push('removed')
			},
		})
		const { container } = mount(BindRef, props)

		await nextFrame()

		props.tick = 1
		flushSync()
		await nextFrame()

		expect(writes).toHaveLength(1)
		expect(writes[0]?.[1]).toBe(find(container, '.written', HTMLButtonElement))
		expect(events).toEqual(['ready'])
	})
})

/** Узлы, на которые встал attachment потребителя и с которых он снят. */
type TAttachmentProbe = {
	readonly attach: Attachment<Element>
	readonly attached: readonly Element[]
	readonly detached: readonly Element[]
}

/** Пробник attachment-а: узлы сверяют по ссылке (`toBe`), как у `readyProbe`, а не моком. */
function attachmentProbe(): TAttachmentProbe {
	const attached: Element[] = []
	const detached: Element[] = []

	return {
		attached,
		detached,
		attach: (node) => {
			attached.push(node)

			return () => {
				detached.push(node)
			}
		},
	}
}

describe('attachment потребителя — на корне', () => {
	it.each(COMPONENTS)(
		'%s: attachment получает корень, element:ready — тот же корень',
		async (_name, draw, selector) => {
			const consumer = attachmentProbe()
			const ready = readyProbe()

			draw({
				onElementReady: ready.onElementReady,
				[createAttachmentKey()]: consumer.attach,
			})
			await nextFrame()

			const root = find(document, selector, HTMLElement)

			expect(consumer.attached).toHaveLength(1)
			expect(consumer.attached[0]).toBe(root)
			expect(ready.elements).toHaveLength(1)
			expect(ready.elements[0]).toBe(root)
		},
	)

	/** Так его вешает потребитель: `{@attach}` прямо на компоненте в своей разметке. */
	it('{@attach} на компоненте в разметке — на корне', () => {
		const consumer = attachmentProbe()
		const { root } = mount(Attach, { attach: consumer.attach })

		expect(consumer.attached).toHaveLength(1)
		expect(consumer.attached[0]).toBe(root())
	})

	it('Frame: на узле в цели телепорта, а не на месте компонента', () => {
		const target = document.createElement('section')

		target.id = 'layer'
		document.body.append(target)

		const consumer = attachmentProbe()
		const { container } = mount(Frame, {
			target: '#layer',
			visible: true,
			[createAttachmentKey()]: consumer.attach,
		})

		expect(consumer.attached).toHaveLength(1)
		expect(consumer.attached[0]?.parentElement).toBe(target)
		expect(container.querySelector('.so-frame')).toBeNull()
	})

	it('Icon по роли: на <svg> иконки', () => {
		const consumer = attachmentProbe()
		const { container } = mount(Icon, {
			tag: roleIcon('check'),
			[createAttachmentKey()]: consumer.attach,
		})

		expect(consumer.attached).toHaveLength(1)
		expect(consumer.attached[0]).toBe(find(container, ':scope > svg', SVGSVGElement))
	})

	it('компонент в tag: на его корне', () => {
		const consumer = attachmentProbe()
		const { container } = mount(Button, {
			tag: Link,
			[createAttachmentKey()]: consumer.attach,
		})

		expect(consumer.attached).toHaveLength(1)
		expect(consumer.attached[0]).toBe(find(container, ':scope > a', HTMLAnchorElement))
	})

	/** Смена тега пересоздаёт узел: attachment отпускает прежний и встаёт на новый. */
	it('смена тега — снят с прежнего корня и встал на новый', async () => {
		const ctrl = new TButton()
		const consumer = attachmentProbe()
		const ready = readyProbe()
		const { root } = mount(Button, {
			ctrl,
			onElementReady: ready.onElementReady,
			[createAttachmentKey()]: consumer.attach,
		})

		await nextFrame()

		const first = root()

		ctrl.tag = 'span'
		flushSync()
		await nextFrame()

		expect(consumer.detached).toHaveLength(1)
		expect(consumer.detached[0]).toBe(first)
		expect(consumer.attached).toHaveLength(2)
		expect(consumer.attached[1]).toBe(root())
		expect(ready.elements.at(-1)).toBe(root())
	})

	/**
	 * Атрибуты корня собираются заново на каждую смену пропа, а attachment —
	 * та же функция: Svelte его не переставляет, и подсказка потребителя не
	 * пересоздаётся от смены класса.
	 */
	it('смена другого атрибута потребителя attachment не переставляет', () => {
		const consumer = attachmentProbe()
		const props = reactiveProps<ButtonProps>({
			class: 'before',
			[createAttachmentKey()]: consumer.attach,
		})
		const { root } = mount(Button, props)

		props.class = 'after'
		flushSync()

		expect(root().classList.contains('after')).toBe(true)
		expect(consumer.attached).toHaveLength(1)
		expect(consumer.detached).toHaveLength(0)
	})

	it('переданный после монтирования встаёт на корень, снятый — снимается', () => {
		const consumer = attachmentProbe()
		const key = createAttachmentKey()
		const props = reactiveProps<ButtonProps>({})
		const { root } = mount(Button, props)

		props[key] = consumer.attach
		flushSync()

		expect(consumer.attached).toHaveLength(1)
		expect(consumer.attached[0]).toBe(root())

		delete props[key]
		flushSync()

		expect(consumer.detached).toHaveLength(1)
		expect(consumer.detached[0]).toBe(root())
	})
})

/**
 * Стиль раскладка отдаёт слоями: свойства ядра и плагинов — объектом, стиль
 * потребителя — его строкой. Имена плагины и ядро пишут по-CSS:
 * пользовательское свойство остаётся под своим именем, `z-index` — тоже. Так
 * размер отдают плагины раскладки окна и выезжающей панели, но этих
 * компонентов в Svelte пока нет, и правило проверяется на самой раскладке
 * корня и на узле, куда её ставит attachment стиля.
 */
describe('раскладка корня: имена стиля — как в CSS', () => {
	it('--* и z-index из layout_styles — под своими именами, значения строкой', () => {
		const { style } = toRootLayout(
			{ layout_styles: { '--so-dialog-width': '320px', 'z-index': 3 } },
			{},
		)

		expect(style.below).toEqual({ '--so-dialog-width': '320px', 'z-index': '3' })
	})

	it('--* и z-index доходят до узла как есть', () => {
		const node = document.createElement('div')
		const attached = attachRootStyle(
			node,
			toRootLayout({ layout_styles: { '--so-dialog-width': '320px', 'z-index': 3 } }, {})
				.style,
		)

		expect(node.style.getPropertyValue('--so-dialog-width')).toBe('320px')
		expect(node.style.zIndex).toBe('3')

		attached.detach()
	})

	it('пустое значение свойства не задаёт', () => {
		expect(toRootLayout({ layout_styles: { width: '', height: '' } }, {}).style.below).toEqual(
			{},
		)
		expect(
			toRootLayout({ layout_styles: { width: '', height: '2em' } }, {}).style.below,
		).toEqual({ height: '2em' })
	})

	it('наборы ядра — первыми, атрибуты потребителя — поверх', () => {
		const props = toRootProps(
			{ classes: ['so-x'] },
			[{ role: 'button', tabindex: '0' }, { 'data-open': 'true' }],
			{ class: 'mine', style: 'color: red' },
		)
		// Пропсы, которые компонент не съел, — всё, что пришло от потребителя
		const forward = { tabindex: -1, class: 'mine' }

		expect(props).toMatchObject({ role: 'button', tabindex: '0', 'data-open': 'true' })
		expect(toRootProps({}, [{ tabindex: '0' }], forward).tabindex).toBe(-1)
		expect(props.class).toEqual(['so-x', 'mine'])
		expect(props.style).toEqual({ below: {}, forward: 'color: red', above: {} })
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
		const { root } = mount(ProgressSpinner, {
			value: 40,
			style: '--so-progress-spinner-fraction: 0.9',
		})

		expect(root().style.getPropertyValue('--so-progress-spinner-fraction')).toBe('0.9')
	})

	it('ProgressSpinner: display: none скрытого корня — поверх стиля потребителя и доли', () => {
		const { root } = mount(ProgressSpinner, {
			value: 40,
			visible: false,
			style: 'display: inline-block',
		})

		expect(root().style.display).toBe('none')
		// Скрытие трогает только `display`: доля остаётся на корне
		expect(root().style.getPropertyValue('--so-progress-spinner-fraction')).toBe('0.4')
	})

	it('ProgressLinear: стиль потребителя — поверх доли, скрытие — поверх обоих', () => {
		const { root } = mount(ProgressLinear, {
			value: 40,
			visible: false,
			style: '--so-progress-linear-percent: 90%; display: block',
		})

		expect(root().style.getPropertyValue('--so-progress-linear-percent')).toBe('90%')
		expect(root().style.display).toBe('none')
	})

	/** Плагина раскладки у кольца нет — правило проверяется на самой раскладке корня. */
	it('стиль-выход — поверх стиля плагина, место элемента — поверх обоих', () => {
		const { style } = toRootLayout(
			{ layout_styles: { '--ring': 'plugin', order: 9 }, order: 2 },
			{},
			{ '--ring': 'own', 'z-index': 3 },
		)

		expect(style.below).toEqual({ '--ring': 'own', order: '2', 'z-index': '3' })
	})
})

/**
 * Слои стиля на узле — в том же порядке: стиль потребителя поверх свойств
 * ядра и плагинов, `display: none` скрытого корня поверх всего. Из
 * одноимённых действует верхний слой, со своим приоритетом: скрытие главнее
 * и `!important` потребителя, как у `v-show`.
 */
describe('раскладка корня: слои стиля на узле', () => {
	it('потребитель — поверх раскладки, скрытие — поверх всего', () => {
		const node = document.createElement('div')
		const attached = attachRootStyle(
			node,
			toRootLayout(
				{ layout_styles: { left: '10px', top: '20px' }, visible: false },
				{ style: 'left: 1px; color: red; display: flex !important' },
			).style,
		)

		expect(node.style.left).toBe('1px')
		expect(node.style.top).toBe('20px')
		expect(node.style.color).toBe('red')
		expect(node.style.display).toBe('none')
		expect(node.style.getPropertyPriority('display')).toBe('')

		attached.detach()
	})

	it('!important потребителя доходит до узла', () => {
		const node = document.createElement('div')
		const attached = attachRootStyle(
			node,
			toRootLayout({}, { style: 'color: red !important' }).style,
		)

		expect(node.style.color).toBe('red')
		expect(node.style.getPropertyPriority('color')).toBe('important')

		attached.detach()
	})
})
