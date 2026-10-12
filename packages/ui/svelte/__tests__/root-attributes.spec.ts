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
 * него.
 */

import { describe, it, expect } from 'vitest'
import { flushSync, type Component } from 'svelte'
import { createAttachmentKey, type Attachment } from 'svelte/attachments'
import { TButton } from '@soldy-ui/core'
import {
	Accordion,
	Button,
	CheckBox,
	ComponentView,
	Frame,
	Icon,
	Input,
	Label,
	ProgressSpinner,
	RadioGroup,
	Skeleton,
	Switch,
	Tabs,
	roleIcon,
	toControlAttrs,
	toRootForward,
	toRootLayout,
	toRootProps,
	type AccordionProps,
	type ButtonProps,
	type CheckBoxProps,
	type ComponentViewProps,
	type FrameProps,
	type IconProps,
	type InputProps,
	type LabelProps,
	type ProgressSpinnerProps,
	type RadioGroupProps,
	type SkeletonProps,
	type SwitchProps,
	type TabsContentProps,
	type TabsProps,
} from '@soldy-ui/svelte'
import Attach from './Attach.test.svelte'
import ItemProbe from './ItemProbe.test.svelte'
import Link from './Link.test.svelte'
import { find, mount, nextFrame, readyProbe, type TMounted } from './mount'
import { reactiveProps } from './reactive-props.svelte'
import { attachRootStyle } from './root-style.svelte'

/** Общие пропсы строки таблицы: направление, атрибуты и колбэк готовности есть у всех. */
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

/**
 * Компонент, как его рисовать, и класс его корня. Пропсы, без которых корень
 * не виден, рисование добавляет само: Frame по умолчанию скрыт и уходит
 * телепортом в `body` — корень ищется по документу; у Icon тега по умолчанию
 * нет; панель рисуется, пока активен её таб, — и только внутри набора.
 */
const COMPONENTS: ReadonlyArray<readonly [string, (props: TProbeProps) => TMounted, string]> = [
	['Button', (props) => mount(Button, props), '.s-button'],
	['ComponentView', (props) => mount(ComponentView, props), '.s-component-view'],
	['Frame', (props) => mount(Frame, { visible: true, ...props }), '.s-frame'],
	['Icon', (props) => mount(Icon, { tag: 'i', ...props }), '.s-icon'],
	['Label', (props) => mount(Label, props), '.s-label'],
	['ProgressSpinner', (props) => mount(ProgressSpinner, props), '.s-progress-spinner'],
	['Skeleton', (props) => mount(Skeleton, props), '.s-skeleton'],
	['Tabs', (props) => mount(Tabs, props), '.s-tabs'],
	['Tabs.Content', (props) => mount(ItemProbe, { kind: 'content', ...props }), '.s-tabs__panel'],
	['Accordion', (props) => mount(Accordion, props), '.s-accordion'],
	['RadioGroup', (props) => mount(RadioGroup, props), '.s-radio-group'],
]

/** Общие пропсы полей в таблице. */
type TFieldProbeProps = CheckBoxProps & SwitchProps & InputProps

/**
 * Поле и класс его корня. Атрибуты потребителя поле делит, как у Vue: класс и
 * стиль — корню, остальное — `<input>`, поверх его набора `aria`. Корень
 * остаётся за адаптером и у него.
 */
const FIELDS: ReadonlyArray<readonly [string, Component<TFieldProbeProps>, string]> = [
	['CheckBox', CheckBox, '.s-check-box'],
	['Switch', Switch, '.s-switch'],
	['Input', Input, '.s-input'],
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
		'.s-tabs-item',
		'.s-tabs-item [role="tab"]',
	],
	[
		'Accordion.Item',
		(props) => mount(ItemProbe, { kind: 'accordion', ...props }),
		'.s-accordion-item',
		'.s-accordion-item__header',
	],
	[
		'RadioGroup.Item',
		(props) => mount(ItemProbe, { kind: 'radio', ...props }),
		'.s-radio-group-item',
		'.s-radio-group-item__input',
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

describe('поле: атрибуты снаружи — <input>, поверх его aria', () => {
	/** Имя полю пишет плагин доступного имени в `aria`, а `aria-label` снаружи — атрибут потребителя. */
	it.each(FIELDS)(
		'%s: aria-label потребителя — поверх имени поля',
		(_name, component, selector) => {
			mount(component, { aria_label: 'Ядро', 'aria-label': 'Своё' })

			const field = find(document, `${selector} input`, HTMLInputElement)

			expect(field.getAttribute('aria-label')).toBe('Своё')
			expect(find(document, selector, HTMLElement).hasAttribute('aria-label')).toBe(false)
		},
	)

	it.each(FIELDS)('%s: класс и стиль — корню, а не полю', (_name, component, selector) => {
		mount(component, { class: 'mine', style: 'color: red' })

		const root = find(document, selector, HTMLElement)
		const field = find(root, 'input', HTMLInputElement)

		expect([...root.classList].at(-1)).toBe('mine')
		expect(root.style.color).toBe('red')
		expect(field.hasAttribute('class')).toBe(false)
		expect(field.hasAttribute('style')).toBe(false)
	})

	/**
	 * Attachment потребителя — тоже «остальное»: поведение, которое он вешает
	 * на поле, встаёт на `<input>`. Привязка корня к `TElementPlugin` — за
	 * адаптером: `element:ready` приходит с корнем.
	 */
	it.each(FIELDS)(
		'%s: attachment потребителя — на <input>, element:ready — с корнем',
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
			expect(consumer.attached[0]).toBe(find(root, 'input', HTMLInputElement))
			expect(ready.elements).toHaveLength(1)
			expect(ready.elements[0]).toBe(root)
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
		expect(container.querySelector('.s-frame')).toBeNull()
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
			{ layout_styles: { '--dialog-width': '320px', 'z-index': 3 } },
			{},
		)

		expect(style.below).toEqual({ '--dialog-width': '320px', 'z-index': '3' })
	})

	it('--* и z-index доходят до узла как есть', () => {
		const node = document.createElement('div')
		const attached = attachRootStyle(
			node,
			toRootLayout({ layout_styles: { '--dialog-width': '320px', 'z-index': 3 } }, {}).style,
		)

		expect(node.style.getPropertyValue('--dialog-width')).toBe('320px')
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
			{ classes: ['s-x'] },
			[{ role: 'button', tabindex: '0' }, { 'data-open': 'true' }],
			{ class: 'mine', style: 'color: red' },
		)
		// Пропсы, которые компонент не съел, — всё, что пришло от потребителя
		const forward = { tabindex: -1, class: 'mine' }

		expect(props).toMatchObject({ role: 'button', tabindex: '0', 'data-open': 'true' })
		expect(toRootProps({}, [{ tabindex: '0' }], forward).tabindex).toBe(-1)
		expect(props.class).toEqual(['s-x', 'mine'])
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
			style: '--s-progress-spinner-fraction: 0.9',
		})

		expect(root().style.getPropertyValue('--s-progress-spinner-fraction')).toBe('0.9')
	})

	it('ProgressSpinner: display: none скрытого корня — поверх стиля потребителя и доли', () => {
		const { root } = mount(ProgressSpinner, {
			value: 40,
			visible: false,
			style: 'display: inline-block',
		})

		expect(root().style.display).toBe('none')
		// Скрытие трогает только `display`: доля остаётся на корне
		expect(root().style.getPropertyValue('--s-progress-spinner-fraction')).toBe('0.4')
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
