/**
 * Общие типы Solid-адаптера @soldy/ui-solid.
 */

import type { JSX } from 'solid-js'
import type { IEntity } from '@soldy/core'
import type {
	IComponentDescriptor,
	DescriptorAllProps,
	DescriptorCallbackEvents,
	DescriptorComponentProps,
	DescriptorSlots,
	TSlotProps,
} from '@soldy/setup'

/** Событийные пропы компонента из дескриптора (core + плагины). */
export type EventProps<TDescriptorFn extends (...args: any[]) => IComponentDescriptor> =
	DescriptorCallbackEvents<TDescriptorFn>

/**
 * Слоты компонента из дескриптора: `default` становится `children`,
 * остальные сохраняют имена. Слот со scope принимает и функцию.
 */
export type SlotProps<TDescriptorFn extends (...args: any[]) => IComponentDescriptor> = TSlotProps<
	DescriptorSlots<TDescriptorFn>,
	JSX.Element
>

/** Props headless-слоя: core props + события + слоты + служебные поля. */
export type UseProps<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TInstance extends IEntity = IEntity,
	TEvents extends object = EventProps<TDescriptorFn>,
> = DescriptorComponentProps<TDescriptorFn, TInstance> & TEvents & SlotProps<TDescriptorFn>

/** Props DOM-компонента: UseProps + HTML-атрибуты без конфликтов с core props. */
export type UseDomProps<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TInstance extends IEntity = IEntity,
	TEvents extends object = EventProps<TDescriptorFn>,
> = UseProps<TDescriptorFn, TInstance, TEvents> &
	Omit<JSX.HTMLAttributes<HTMLElement>, keyof DescriptorAllProps<TDescriptorFn> | 'children'>
