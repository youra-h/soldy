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
 */

import { describe, it, expect, vi } from 'vitest'
import { createRef, type ComponentType } from 'react'
import {
	Button,
	ComponentView,
	Frame,
	Icon,
	Label,
	Skeleton,
	Spinner,
	type ButtonProps,
	type ComponentViewProps,
	type FrameProps,
	type IconProps,
	type LabelProps,
	type SkeletonProps,
	type SpinnerProps,
} from '@soldy-ui/react'
import { find, mount, nextFrame } from './mount'

/** Общие пропсы строки таблицы: направление и колбэк готовности есть у всех семи. */
type TProbeProps = ButtonProps &
	ComponentViewProps &
	FrameProps &
	IconProps &
	LabelProps &
	SkeletonProps &
	SpinnerProps

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
	['Skeleton', Skeleton, '.s-skeleton', {}],
	['Spinner', Spinner, '.s-spinner', {}],
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

	it('Spinner: role потребителя — поверх role="status" ядра', () => {
		const { root } = mount(<Spinner role="progressbar" />)

		expect(root().getAttribute('role')).toBe('progressbar')
	})

	it('без атрибута снаружи остаётся набор ядра', () => {
		const { root } = mount(<Button tag="div" direction="rtl" />)

		expect(root().getAttribute('tabindex')).toBe('0')
		expect(root().getAttribute('dir')).toBe('rtl')
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
})
