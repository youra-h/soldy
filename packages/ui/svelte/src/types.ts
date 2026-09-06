/**
 * Общие типы Svelte-адаптера @soldy/ui-svelte.
 */

import type { Snippet } from 'svelte'
import type { HTMLAttributes } from 'svelte/elements'
import type { IEntity } from '@soldy/core'
import type { IPluginBundle } from '@soldy/plugins'
import type {
	IComponentDescriptor,
	DescriptorProps,
	DescriptorAllEvents,
	TCallbackEventProps,
} from '@soldy/setup'

/**
 * Базовые props Svelte-компонента: core-props + служебные поля.
 *
 * - `ctrl` — готовый core-инстанс (если не передан, создаётся из Ctor)
 * - `plugins` — готовый бандл плагинов
 * - `children` — сниппет содержимого (аналог default slot во Vue)
 */
export type TSvelteComponentProps<TCoreProps, TInstance extends IEntity = IEntity> = TCoreProps & {
	ctrl?: TInstance
	plugins?: IPluginBundle
	children?: Snippet
}

/** Событийные пропы компонента из дескриптора (core + плагины). */
export type EventProps<TDescriptorFn extends (...args: any[]) => IComponentDescriptor> =
	TCallbackEventProps<DescriptorAllEvents<TDescriptorFn>>

/** Props headless-слоя: core props + события + служебные поля. */
export type UseProps<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TInstance extends IEntity = IEntity,
	TEvents extends object = EventProps<TDescriptorFn>,
> = TSvelteComponentProps<DescriptorProps<TDescriptorFn>, TInstance> & TEvents

/** Props DOM-компонента: UseProps + HTML-атрибуты без конфликтов с core props. */
export type UseDomProps<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TInstance extends IEntity = IEntity,
	TEvents extends object = EventProps<TDescriptorFn>,
> = UseProps<TDescriptorFn, TInstance, TEvents> &
	Omit<HTMLAttributes<HTMLElement>, keyof DescriptorProps<TDescriptorFn>>
