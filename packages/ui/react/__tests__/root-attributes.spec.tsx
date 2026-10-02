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
 * не было бы `element:ready`.
 *
 * Элемент коллекции (`Tabs.Item`, `Accordion.Item`) делит атрибуты
 * потребителя, как у Vue: класс и стиль — корню, остальное — строке, поверх её
 * набора `aria`. Корень остаётся за адаптером и у него.
 */

import { describe, it, expect, vi } from 'vitest'
import { createRef, type ComponentType, type ReactNode } from 'react'
import {
	Accordion,
	Button,
	ComponentView,
	Frame,
	Icon,
	Label,
	ProgressSpinner,
	Skeleton,
	Tabs,
	type AccordionItemProps,
	type AccordionProps,
	type ButtonProps,
	type ComponentViewProps,
	type FrameProps,
	type IconProps,
	type LabelProps,
	type ProgressSpinnerProps,
	type SkeletonProps,
	type TabsContentProps,
	type TabsItemProps,
	type TabsProps,
	toRootLayout,
} from '@soldy-ui/react'
import { find, mount, nextFrame } from './mount'

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
	['Button', Button, '.s-button', {}],
	['ComponentView', ComponentView, '.s-component-view', {}],
	['Frame', Frame, '.s-frame', {}],
	['Icon', Icon, '.s-icon', { tag: 'i' }],
	['Label', Label, '.s-label', {}],
	['ProgressSpinner', ProgressSpinner, '.s-progress-spinner', {}],
	['Skeleton', Skeleton, '.s-skeleton', {}],
	['Tabs', Tabs, '.s-tabs', {}],
	['Tabs.Content', TabsContentProbe, '.s-tabs__panel', {}],
	['Accordion', Accordion, '.s-accordion', {}],
]

/** Общие пропсы элементов коллекций в таблице. */
type TItemProbeProps = TabsItemProps & AccordionItemProps

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

/** Элемент коллекции, класс его корня и строка, которой уходят атрибуты потребителя. */
const ITEMS: ReadonlyArray<readonly [string, ComponentType<TItemProbeProps>, string, string]> = [
	['Tabs.Item', TabsItemProbe, '.s-tabs-item', '.s-tabs-item [role="tab"]'],
	['Accordion.Item', AccordionItemProbe, '.s-accordion-item', '.s-accordion-item__header'],
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

describe('ref потребителя не выбивает привязку корня к TElementPlugin', () => {
	it.each(COMPONENTS)(
		'%s: element:ready приходит с корнем',
		async (_name, Component, selector, own) => {
			const onElementReady = vi.fn()
			// `ref` в типах пропсов нет, но из атрибутов потребителя он доходит до корня
			const attributes: Record<string, unknown> = { ref: createRef() }

			mount(<Component {...own} {...attributes} onElementReady={onElementReady} />)
			await nextFrame()

			expect(onElementReady).toHaveBeenCalledWith(find(document, selector, HTMLElement))
		},
	)

	it.each(ITEMS)('%s: element:ready приходит с корнем элемента', async (_name, Probe, root) => {
		const onElementReady = vi.fn()
		// `ref` уходит строке вместе с остальными атрибутами, корень — за адаптером
		const attributes: Record<string, unknown> = { ref: createRef() }

		mount(<Probe {...attributes} onElementReady={onElementReady} />)
		await nextFrame()

		expect(onElementReady).toHaveBeenCalledWith(find(document, root, HTMLElement))
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
		const layout = toRootLayout({ layout_styles: { '--dialog-width': '320px' } }, {})
		const { root } = mount(<div {...layout} />)

		expect(root().style.getPropertyValue('--dialog-width')).toBe('320px')
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
	const consumer: Record<string, string> = { '--s-progress-spinner-fraction': '0.9' }

	it('ProgressSpinner: стиль потребителя — поверх доли', () => {
		const { root } = mount(<ProgressSpinner value={40} style={consumer} />)

		expect(root().style.getPropertyValue('--s-progress-spinner-fraction')).toBe('0.9')
	})

	it('ProgressSpinner: display: none скрытого корня — поверх стиля потребителя и доли', () => {
		const { root } = mount(
			<ProgressSpinner value={40} visible={false} style={{ display: 'inline-block' }} />,
		)

		expect(root().style.display).toBe('none')
		// Скрытие трогает только `display`: доля остаётся на корне
		expect(root().style.getPropertyValue('--s-progress-spinner-fraction')).toBe('0.4')
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
