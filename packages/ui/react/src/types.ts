/**
 * Общие типы для React-адаптера @soldy-ui/react.
 */

import type { HTMLAttributes, ReactNode } from 'react'
import type { IEntity } from '@soldy-ui/core'
import type {
	IComponentDescriptor,
	DescriptorAllProps,
	DescriptorCallbackEvents,
	DescriptorComponentProps,
	DescriptorSlots,
	TSlotProps,
} from '@soldy-ui/setup'

/** Событийные пропсы компонента из дескриптора (core + плагины). */
export type EventProps<TDescriptorFn extends (...args: any[]) => IComponentDescriptor> =
	DescriptorCallbackEvents<TDescriptorFn>

/**
 * Слоты компонента из дескриптора: `default` становится `children`,
 * остальные сохраняют имена. Слот со scope принимает и функцию.
 */
export type SlotProps<TDescriptorFn extends (...args: any[]) => IComponentDescriptor> = TSlotProps<
	DescriptorSlots<TDescriptorFn>,
	ReactNode
>

/** Props headless-компонента: core props + события + слоты + служебные поля. */
export type UseProps<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TInstance extends IEntity = IEntity,
	TEvents extends object = EventProps<TDescriptorFn>,
> = DescriptorComponentProps<TDescriptorFn, TInstance> & TEvents & SlotProps<TDescriptorFn>

/**
 * Props DOM-компонента: UseProps + HTML-атрибуты без конфликтов с пропсами и
 * слотами дескриптора.
 *
 * Слот, как и проп, важнее одноимённого атрибута: пересечение сузило бы его до
 * типа атрибута. `children` из HTMLAttributes объявлен `ReactNode` и убил бы
 * форму-функцию scoped-слота (`ReactNode | ((scope) => ReactNode)`), а
 * `content` — атрибут RDFa со строкой — не пустил бы разметку в слот
 * `content` у Label.
 */
export type UseDomProps<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TInstance extends IEntity = IEntity,
	TEvents extends object = EventProps<TDescriptorFn>,
> = UseProps<TDescriptorFn, TInstance, TEvents> &
	Omit<
		HTMLAttributes<HTMLElement>,
		keyof DescriptorAllProps<TDescriptorFn> | keyof SlotProps<TDescriptorFn>
	>
