/**
 * Общие типы Solid-адаптера @soldy/ui-solid.
 */

import type { JSX } from 'solid-js'
import type { IEntity } from '@soldy/core'
import type {
	IComponentDescriptor,
	DescriptorAllProps,
	DescriptorSlots,
	DescriptorAllEvents,
	TCallbackEventProps,
	TSlotProps,
	TRegisteredPluginEvents,
	TRegisteredPluginProps,
} from '@soldy/setup'

/**
 * Базовые props Solid-компонента: core-props + `ctrl` — готовый core-инстанс
 * (если не передан, создаётся из Ctor).
 *
 * `children` здесь нет: слот по умолчанию объявлен в контракте компонента
 * наравне с остальными и приходит из SlotProps.
 */
export type TSolidComponentProps<TCoreProps, TInstance extends IEntity = IEntity> = TCoreProps & {
	ctrl?: TInstance
	/**
	 * Имя места, если компонент — деталь разметки другого компонента soldy
	 * (`tags.close`). Ставит разметка библиотеки, а не потребитель: по нему
	 * `usePlugins` со `scope: 'own'` пропускает вложенный компонент.
	 */
	embedded?: string
}

/** Событийные пропы компонента из дескриптора (core + плагины). */
export type EventProps<TDescriptorFn extends (...args: any[]) => IComponentDescriptor> =
	TCallbackEventProps<DescriptorAllEvents<TDescriptorFn>>

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
> = TSolidComponentProps<
	DescriptorAllProps<TDescriptorFn> & TRegisteredPluginProps<TInstance>,
	TInstance
> &
	TEvents &
	// Плагины реестра (`usePlugins`) — по типу инстанса, из `IRegisteredPlugins`
	TCallbackEventProps<TRegisteredPluginEvents<TInstance>> &
	SlotProps<TDescriptorFn>

/** Props DOM-компонента: UseProps + HTML-атрибуты без конфликтов с core props. */
export type UseDomProps<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TInstance extends IEntity = IEntity,
	TEvents extends object = EventProps<TDescriptorFn>,
> = UseProps<TDescriptorFn, TInstance, TEvents> &
	Omit<JSX.HTMLAttributes<HTMLElement>, keyof DescriptorAllProps<TDescriptorFn> | 'children'>
