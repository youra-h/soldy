/**
 * Общие типы для React-адаптера @soldy/ui-react.
 */

import type { HTMLAttributes, ReactNode } from 'react'
import type { IEntity } from '@soldy/core'
import type { IPluginBundle } from '@soldy/plugins'
import type { IComponentDescriptor, DescriptorProps, DescriptorAllEvents } from '@soldy/setup'
import type { ReactEventProps } from './adapter/common/naming.types'

/**
 * Базовые props React-компонента: core-props + служебные поля.
 *
 * - `ctrl` — готовый core-инстанс (если не передан, создаётся из Ctor)
 * - `plugins` — готовый бандл плагинов (для обратной совместимости)
 * - `children` — содержимое слота (аналог default slot во Vue)
 */
export type TReactComponentProps<
	TCoreProps,
	TInstance extends IEntity = IEntity,
> = TCoreProps & {
	ctrl?: TInstance
	plugins?: IPluginBundle
	children?: ReactNode
}

/** Событийные пропсы компонента из дескриптора (core + плагины): ReactEventProps<DescriptorAllEvents<...>>. */
export type EventProps<TDescriptorFn extends (...args: any[]) => IComponentDescriptor> =
	ReactEventProps<DescriptorAllEvents<TDescriptorFn>>

/** Props headless-компонента: core props + события + служебные поля. */
export type UseProps<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TInstance extends IEntity = IEntity,
	TEvents extends object = EventProps<TDescriptorFn>,
> = TReactComponentProps<DescriptorProps<TDescriptorFn>, TInstance> & TEvents

/** Props DOM-компонента: UseProps + HTML-атрибуты без конфликтов с core props. */
export type UseDomProps<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TInstance extends IEntity = IEntity,
	TEvents extends object = EventProps<TDescriptorFn>,
> = UseProps<TDescriptorFn, TInstance, TEvents> &
	Omit<HTMLAttributes<HTMLElement>, keyof DescriptorProps<TDescriptorFn>>
