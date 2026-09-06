/**
 * Общие типы Solid-адаптера @soldy/ui-solid.
 */

import type { JSX } from 'solid-js'
import type { IEntity } from '@soldy/core'
import type { IPluginBundle } from '@soldy/plugins'
import type {
	IComponentDescriptor,
	DescriptorProps,
	DescriptorAllEvents,
	TCallbackEventProps,
} from '@soldy/setup'

/**
 * Базовые props Solid-компонента: core-props + служебные поля.
 *
 * - `ctrl` — готовый core-инстанс (если не передан, создаётся из Ctor)
 * - `plugins` — готовый бандл плагинов
 * - `children` — содержимое слота
 */
export type TSolidComponentProps<TCoreProps, TInstance extends IEntity = IEntity> = TCoreProps & {
	ctrl?: TInstance
	plugins?: IPluginBundle
	children?: JSX.Element
}

/** Событийные пропы компонента из дескриптора (core + плагины). */
export type EventProps<TDescriptorFn extends (...args: any[]) => IComponentDescriptor> =
	TCallbackEventProps<DescriptorAllEvents<TDescriptorFn>>

/** Props headless-слоя: core props + события + служебные поля. */
export type UseProps<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TInstance extends IEntity = IEntity,
	TEvents extends object = EventProps<TDescriptorFn>,
> = TSolidComponentProps<DescriptorProps<TDescriptorFn>, TInstance> & TEvents

/** Props DOM-компонента: UseProps + HTML-атрибуты без конфликтов с core props. */
export type UseDomProps<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TInstance extends IEntity = IEntity,
	TEvents extends object = EventProps<TDescriptorFn>,
> = UseProps<TDescriptorFn, TInstance, TEvents> &
	Omit<JSX.HTMLAttributes<HTMLElement>, keyof DescriptorProps<TDescriptorFn> | 'children'>
