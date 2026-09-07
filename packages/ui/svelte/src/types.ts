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
	DescriptorSlots,
	DescriptorAllEvents,
	TCallbackEventProps,
	DEFAULT_SLOT,
} from '@soldy/setup'

/**
 * Базовые props Svelte-компонента: core-props + служебные поля.
 *
 * - `ctrl` — готовый core-инстанс (если не передан, создаётся из Ctor)
 * - `plugins` — готовый бандл плагинов
 *
 * `children` здесь нет: слот по умолчанию объявлен в контракте компонента
 * наравне с остальными и приходит из SlotProps.
 */
export type TSvelteComponentProps<TCoreProps, TInstance extends IEntity = IEntity> = TCoreProps & {
	ctrl?: TInstance
	plugins?: IPluginBundle
}

/** Событийные пропы компонента из дескриптора (core + плагины). */
export type EventProps<TDescriptorFn extends (...args: any[]) => IComponentDescriptor> =
	TCallbackEventProps<DescriptorAllEvents<TDescriptorFn>>

/**
 * Слоты как snippet-пропы — родной механизм Svelte 5.
 *
 * Отдельно от общего `TSlotProps`: там слот со scope это `узел | функция`,
 * а здесь и то и другое выражается одним `Snippet` — разница только в
 * объявленных параметрах. Сниппет без параметров присваивается `Snippet<[S]>`,
 * поэтому `<Button>текст</Button>` продолжает работать без изменений.
 */
export type TSnippetSlots<TSlots extends object> = {
	[K in keyof TSlots as K extends typeof DEFAULT_SLOT ? 'children' : K]?: TSlots[K] extends object
		? keyof TSlots[K] extends never
			? Snippet
			: Snippet<[TSlots[K]]>
		: Snippet
}

/** Слоты компонента из дескриптора. */
export type SlotProps<TDescriptorFn extends (...args: any[]) => IComponentDescriptor> =
	TSnippetSlots<DescriptorSlots<TDescriptorFn>>

/** Props headless-слоя: core props + события + слоты + служебные поля. */
export type UseProps<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TInstance extends IEntity = IEntity,
	TEvents extends object = EventProps<TDescriptorFn>,
> = TSvelteComponentProps<DescriptorProps<TDescriptorFn>, TInstance> &
	TEvents &
	SlotProps<TDescriptorFn>

/** Props DOM-компонента: UseProps + HTML-атрибуты без конфликтов с core props. */
export type UseDomProps<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TInstance extends IEntity = IEntity,
	TEvents extends object = EventProps<TDescriptorFn>,
> = UseProps<TDescriptorFn, TInstance, TEvents> &
	Omit<HTMLAttributes<HTMLElement>, keyof DescriptorProps<TDescriptorFn> | 'children'>
