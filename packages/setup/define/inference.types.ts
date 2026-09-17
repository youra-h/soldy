/**
 * Вывод типов из дескриптора для адаптеров: пропсы, события, плагины и слоты компонента.
 *
 * Фабрика дескриптора — единственный источник типов: адаптер не импортирует
 * интерфейсы пропсов и карты событий из ядра, а выводит их отсюда.
 */

import type { TPluginInternalEvents } from '@soldy/plugins'
import type { TUnderscorePropName } from '../naming'
import type { IComponentDescriptor, IPluginDefinition } from './types'

/** Инстанс дескриптора: из своего `ctor`, а без него — унаследованный от `extends`. */
export type TResolveInstance<TOwn extends object, TParent extends object> = [TOwn] extends [never]
	? TParent
	: TOwn

/* -------------------------------------------------------------------------- */
/* Extractors: вывод типов из фабрики дескриптора (единственный source of truth) */
/* -------------------------------------------------------------------------- */

/** Тип инстанса дескриптора: TDescriptorInstance<typeof ButtonDescriptor> → IComponentDescriptor<...> */
export type TDescriptorInstance<T> = T extends (...args: any[]) => infer R ? R : never

/** Props компонента из дескриптора: DescriptorProps<typeof ButtonDescriptor> → IButtonProps */
export type DescriptorProps<T> =
	TDescriptorInstance<T> extends IComponentDescriptor<infer P, any, any, any> ? P : never

/** Собственные события компонента (БЕЗ плагинных): DescriptorEvents<typeof ButtonDescriptor> → TButtonEvents */
export type DescriptorEvents<T> =
	TDescriptorInstance<T> extends IComponentDescriptor<any, infer E, any, any> ? E : never

/** Список плагинов дескриптора (tuple): DescriptorPlugins<typeof ButtonDescriptor> → readonly [ElementDef, ReadyDef] */
export type DescriptorPlugins<T> =
	TDescriptorInstance<T> extends IComponentDescriptor<any, any, infer P, any> ? P : readonly []

/** Слоты дескриптора: DescriptorSlots<typeof ButtonDescriptor> → TButtonSlots */
export type DescriptorSlots<T> =
	TDescriptorInstance<T> extends IComponentDescriptor<any, any, any, infer S> ? S : object

/* -------------------------------------------------------------------------- */
/* Framework-agnostic composition helpers                                      */
/* -------------------------------------------------------------------------- */

/** NamespacedEvents<{ ready: ... }, 'element'> → { 'element:ready': ... } */
export type NamespacedEvents<T extends object, N extends string> = {
	[K in keyof T as K extends string ? `${N}:${K}` : never]: T[K]
}

/**
 * Карта плагина без внутренних событий базы (`install`, `destroy`).
 *
 * Наружу адаптер пробрасывает только события contribution плагина, а базовые
 * среди них задаёт `PLUGIN_EVENTS`. Внутренние выведены из того же списка
 * (`TPluginInternalEvents`), поэтому плагинные события в типах дескриптора не
 * обещают того, что не придёт: `action:install` нет ни в них, ни в рантайме.
 */
type TPublishedPluginEvents<T extends object> = Omit<T, keyof TPluginInternalEvents>

/** События всех плагинов дескриптора (namespaced): { 'element:ready': ..., 'element:removed': ... } */
export type TPluginEventsFrom<P extends readonly IPluginDefinition[]> = P extends readonly [
	infer Head,
	...infer Tail,
]
	? Head extends IPluginDefinition<infer N, infer PE>
		? N extends string
			? Tail extends readonly IPluginDefinition[]
				? NamespacedEvents<TPublishedPluginEvents<PE>, N> & TPluginEventsFrom<Tail>
				: NamespacedEvents<TPublishedPluginEvents<PE>, N>
			: Tail extends readonly IPluginDefinition[]
				? TPluginEventsFrom<Tail>
				: object
		: object
	: object

/** Все события дескриптора (свои + плагинные, namespaced): DescriptorAllEvents<typeof ButtonDescriptor> → TButtonEvents & { 'element:ready': ... } */
export type DescriptorAllEvents<T> = DescriptorEvents<T> & TPluginEventsFrom<DescriptorPlugins<T>>

/** NamespacedProps<{ label: ... }, 'aria'> → { aria_label: ... } (naming — как в underscorePropNaming) */
type NamespacedProps<T extends object, N extends string> = {
	[K in keyof T as K extends string ? TUnderscorePropName<N, K> : never]: T[K]
}

/** Пропсы всех плагинов дескриптора (namespaced): { aria_label?: ..., anchor_placement?: ... } */
export type TPluginPropsFrom<P extends readonly IPluginDefinition[]> = P extends readonly [
	infer Head,
	...infer Tail,
]
	? Head extends IPluginDefinition<infer N, any, infer PP>
		? N extends string
			? Tail extends readonly IPluginDefinition[]
				? NamespacedProps<PP, N> & TPluginPropsFrom<Tail>
				: NamespacedProps<PP, N>
			: Tail extends readonly IPluginDefinition[]
				? TPluginPropsFrom<Tail>
				: object
		: object
	: object

/** Все пропсы дескриптора (свои + плагинные, namespaced): DescriptorAllProps<typeof ButtonDescriptor> → IButtonProps & { aria_label?: ... } */
export type DescriptorAllProps<T> = DescriptorProps<T> & TPluginPropsFrom<DescriptorPlugins<T>>
