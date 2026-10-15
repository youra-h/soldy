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
 * Элемент коллекции (`Tabs.Item`, `Accordion.Item`, `RadioGroup.Item`) делит
 * атрибуты потребителя, как у Vue: класс и стиль — корню, остальное — строке
 * (у радио — полю), поверх её набора `aria`. Корень остаётся за адаптером и у
 * него.
 */

import { describe, it, expect, vi } from 'vitest'
import { StrictMode, act, createRef, type ComponentType, type ReactNode, type Ref } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { TButton, type TTableColumnSource } from '@soldy-ui/core'
import {
	Accordion,
	Button,
	CheckBox,
	ComponentView,
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
	type AccordionItemProps,
	type AccordionProps,
	type ButtonProps,
	type ComponentViewProps,
	type FrameProps,
	type IconProps,
	type LabelProps,
	type ListBoxItemProps,
	type ProgressSpinnerProps,
	type RadioGroupItemProps,
	type RadioGroupProps,
	type SkeletonProps,
	type TabsContentProps,
	type TabsItemProps,
	type TabsProps,
	toControlAttrs,
	toRootForward,
	toRootLayout,
} from '@soldy-ui/react'
import { find, mount, nextFrame, track } from './mount'

/** Общие пропсы строки таблицы: направление и колбэк готовности есть у всех. */
type TProbeProps = ButtonProps &
	ComponentViewProps &
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
function TabsContentProbe(props: TabsContentProps): ReactNode {
	return (
		<Tabs content={<Tabs.Content value="a" {...props} />}>
			<Tabs.Item value="a" text="A" active />
		</Tabs>
	)
}

/**
 * Компонент, класс его корня и пропсы, без которых он не рисуется: у Icon
 * тега по умолчанию нет. Frame уходит телепортом в `body` — корень ищется
 * по документу.
 */
const COMPONENTS: ReadonlyArray<
	readonly [string, ComponentType<TProbeProps>, string, Partial<TProbeProps>]
> = [
	['Button', Button, '.so-button', {}],
	['ComponentView', ComponentView, '.so-component-view', {}],
	['Frame', Frame, '.so-frame', {}],
	['Icon', Icon, '.so-icon', { tag: 'i' }],
	['Label', Label, '.so-label', {}],
	['ProgressSpinner', ProgressSpinner, '.so-progress-spinner', {}],
	['Skeleton', Skeleton, '.so-skeleton', {}],
	['Tabs', Tabs, '.so-tabs', {}],
	['Tabs.Content', TabsContentProbe, '.so-tabs__panel', {}],
	['Accordion', Accordion, '.so-accordion', {}],
	['RadioGroup', RadioGroup, '.so-radio-group', {}],
]

/** Общие пропсы элементов коллекций в таблице. */
type TItemProbeProps = TabsItemProps & AccordionItemProps & RadioGroupItemProps

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

/** Элемент коллекции, класс его корня и строка, которой уходят атрибуты потребителя. */
const ITEMS: ReadonlyArray<readonly [string, ComponentType<TItemProbeProps>, string, string]> = [
	['Tabs.Item', TabsItemProbe, '.so-tabs-item', '.so-tabs-item [role="tab"]'],
	['Accordion.Item', AccordionItemProbe, '.so-accordion-item', '.so-accordion-item__header'],
	['RadioGroup.Item', RadioGroupItemProbe, '.so-radio-group-item', '.so-radio-group-item__input'],
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
 * элемент коллекции отдают корень, а не `<input>` и не строку.
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
	['Icon', (props) => <Icon tag="i" {...props} />, '.so-icon', '.so-icon'],
	['Label', (props) => <Label {...props} />, '.so-label', '.so-label'],
	[
		'ProgressSpinner',
		(props) => <ProgressSpinner {...props} />,
		'.so-progress-spinner',
		'.so-progress-spinner',
	],
	['Skeleton', (props) => <Skeleton {...props} />, '.so-skeleton', '.so-skeleton'],
	['Input', (props) => <Input {...props} />, '.so-input', '.so-input'],
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
	[
		'Table',
		(props) => (
			<Table columns={COLUMNS} items={[{ data: { id: 1, name: 'Анна' } }]} {...props} />
		),
		'.so-table__viewport',
		'table.so-table',
	],
]

/** Поля: `ref` потребителя — корень, а не `<input>`. */
const FIELD_ROOTS = ROOTS.filter(([name]) =>
	['Input', 'CheckBox', 'Switch', 'RadioGroup.Item'].includes(name),
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

	it.each(FIELD_ROOTS)('%s: ref — корень, а не <input>', (_name, draw, selector) => {
		const probe = refProbe()

		mount(<>{draw({ ref: probe.ref })}</>)

		const root = find(document, selector, Element)

		expect(probe.nodes[0]).toBe(root)
		expect(probe.nodes).not.toContain(find(root, 'input', HTMLInputElement))
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

/**
 * Имена стиля плагина раскладки React получает в camelCase (`z-index` →
 * `zIndex`, сторожит `frame.spec.tsx`), а пользовательское свойство — под
 * своим именем: `--dialogWidth` было бы другим свойством, и тема его не
 * прочла бы. Так размер отдают плагины раскладки окна и выезжающей панели, но
 * этих компонентов в React пока нет, и правило проверяется на самой раскладке
 * корня.
 */
describe('раскладка корня: пользовательское свойство — под своим именем', () => {
	it('--* из layout_styles доходит до узла как есть', () => {
		const layout = toRootLayout({ layout_styles: { '--so-dialog-width': '320px' } }, {})
		const { root } = mount(<div {...layout} />)

		expect(root().style.getPropertyValue('--so-dialog-width')).toBe('320px')
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
