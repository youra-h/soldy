/**
 * Общие типы для React-адаптера @soldy/ui-react.
 */

import type { HTMLAttributes, ReactNode } from 'react'
import type { IEntity } from '@soldy/core'
import type { IPluginBundle } from '@soldy/plugins'
import type {
	IComponentDescriptor,
	DescriptorProps,
	DescriptorSlots,
	DescriptorAllEvents,
	TCallbackEventProps,
	TSlotProps,
} from '@soldy/setup'

/**
 * Базовые props React-компонента: core-props + служебные поля.
 *
 * - `ctrl` — готовый core-инстанс (если не передан, создаётся из Ctor)
 * - `plugins` — готовый бандл плагинов (для обратной совместимости)
 *
 * `children` здесь нет: слот по умолчанию объявлен в контракте компонента
 * наравне с остальными и приходит из SlotProps.
 */
export type TReactComponentProps<
	TCoreProps,
	TInstance extends IEntity = IEntity,
> = TCoreProps & {
	ctrl?: TInstance
	plugins?: IPluginBundle
}

/** Событийные пропсы компонента из дескриптора (core + плагины). */
export type EventProps<TDescriptorFn extends (...args: any[]) => IComponentDescriptor> =
	TCallbackEventProps<DescriptorAllEvents<TDescriptorFn>>

/**
 * Слоты компонента из дескриптора: `default` становится `children`,
 * остальные сохраняют имена. Слот со scope принимает и функцию.
 */
export type SlotProps<TDescriptorFn extends (...args: any[]) => IComponentDescriptor> =
	TSlotProps<DescriptorSlots<TDescriptorFn>, ReactNode>

/** Props headless-компонента: core props + события + слоты + служебные поля. */
export type UseProps<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TInstance extends IEntity = IEntity,
	TEvents extends object = EventProps<TDescriptorFn>,
> = TReactComponentProps<DescriptorProps<TDescriptorFn>, TInstance> &
	TEvents &
	SlotProps<TDescriptorFn>

/**
 * Props DOM-компонента: UseProps + HTML-атрибуты без конфликтов с core props.
 *
 * `children` из HTMLAttributes исключён: он объявлен `ReactNode`, и пересечение
 * со scoped-слотом (`ReactNode | ((scope) => ReactNode)`) убило бы форму-функцию.
 */
export type UseDomProps<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TInstance extends IEntity = IEntity,
	TEvents extends object = EventProps<TDescriptorFn>,
> = UseProps<TDescriptorFn, TInstance, TEvents> &
	Omit<HTMLAttributes<HTMLElement>, keyof DescriptorProps<TDescriptorFn> | 'children'>
