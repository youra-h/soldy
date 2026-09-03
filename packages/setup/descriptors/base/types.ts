/**
 * Типы для ComponentDescriptor.
 * Работают через TAccessor: Unit = { instance, props, events }.
 */

import type { IContribution, IPropDeclaration, TAccessor, TName } from '@soldy/accessor'
import type { IPluginBundle, IPluginConstructor } from '@soldy/plugins'

/** Определение плагина в составе дескриптора. */
export interface IPluginDefinition<
	N extends string | undefined = string | undefined,
	TEvents extends object = {},
> {
	ctor: IPluginConstructor<any, any, any>
	/** Нормализованные props из contribution */
	props: IPropDeclaration[]
	/** Нормализованные events из contribution */
	events: TName[]
	/** Опции, передаваемые в plugin.install(ctx, options) */
	options?: Record<string, any>
	/** Namespace плагина (проброшен из definePlugin для вывода типов в адаптерах). */
	namespace?: N
}

/** Опции для defineComponent(). */
export interface IComponentDefinitionOptions<
	TPlugins extends readonly IPluginDefinition[] = readonly [],
	TParentPlugins extends readonly IPluginDefinition[] = readonly [],
> {
	/** Конструктор core-компонента */
	ctor?: any
	/** Родительский дескриптор (наследование props, events, plugins) */
	extends?: IComponentDescriptor<any, any, TParentPlugins>
	/** Собственная контрибуция компонента */
	contribution?: IContribution
	/** Плагины (каждый — результат definePlugin) */
	plugins?: readonly [...TPlugins]
}

/**
 * Дескриптор компонента — единственный источник истины.
 *
 * TProps/TEvents — phantom-параметры: в рантайме не используются, но позволяют
 * адаптерам выводить типы props/events прямо из фабрики дескриптора
 * (DescriptorProps<typeof ButtonDescriptor> → IButtonProps).
 */
export interface IComponentDescriptor<
	TProps extends object = Record<string, unknown>,
	TEvents extends object = {},
	TPlugins extends readonly IPluginDefinition[] = readonly [],
> {
	ctor: any
	/** Статические объявления для useProps/useEmits (без instances) */
	props: IPropDeclaration[]
	events: TName[]
	plugins: IPluginDefinition[]

	createBundle(instance: any): IPluginBundle | null
	/** Создаёт TAccessor: Unit'ы из instance и plugin instances */
	createAccessor(instance: any, bundle: IPluginBundle | null): TAccessor
}

/* -------------------------------------------------------------------------- */
/* Extractors: вывод типов из фабрики дескриптора (единственный source of truth) */
/* -------------------------------------------------------------------------- */

/** Тип инстанса дескриптора: TDescriptorInstance<typeof ButtonDescriptor> → IComponentDescriptor<...> */
export type TDescriptorInstance<T> = T extends (...args: any[]) => infer R ? R : never

/** Props компонента из дескриптора: DescriptorProps<typeof ButtonDescriptor> → IButtonProps */
export type DescriptorProps<T> =
	TDescriptorInstance<T> extends IComponentDescriptor<infer P, any, any> ? P : never

/** Собственные события компонента (БЕЗ плагинных): DescriptorEvents<typeof ButtonDescriptor> → TButtonEvents */
export type DescriptorEvents<T> =
	TDescriptorInstance<T> extends IComponentDescriptor<any, infer E, any> ? E : never

/** Список плагинов дескриптора (tuple): DescriptorPlugins<typeof ButtonDescriptor> → readonly [ElementDef, ReadyDef] */
export type DescriptorPlugins<T> =
	TDescriptorInstance<T> extends IComponentDescriptor<any, any, infer P> ? P : readonly []

/** События плагина из дескриптора: PluginDescriptorEvents<typeof ElementPluginDescriptor> → TElementServiceEvents */
export type PluginDescriptorEvents<T> =
	TDescriptorInstance<T> extends IPluginDefinition<any, infer E> ? E : {}

/** Namespace плагина из дескриптора: PluginDescriptorNamespace<typeof ElementPluginDescriptor> → 'element' */
export type PluginDescriptorNamespace<T> =
	TDescriptorInstance<T> extends IPluginDefinition<infer N, any> ? NonNullable<N> : never

/* -------------------------------------------------------------------------- */
/* Framework-agnostic composition helpers                                      */
/* -------------------------------------------------------------------------- */

/** NamespacedEvents<{ ready: ... }, 'element'> → { 'element:ready': ... } */
export type NamespacedEvents<T extends object, N extends string> = {
	[K in keyof T as K extends string ? `${N}:${K}` : never]: T[K]
}

/** MergeEvents<[A, B]> → A & B (объединение нескольких событийных интерфейсов) */
export type MergeEvents<T extends readonly object[]> = T extends [infer F, ...infer R]
	? F extends object
		? R extends object[]
			? R extends []
				? F
				: F & MergeEvents<R>
			: F
		: {}
	: {}

/** События всех плагинов дескриптора (namespaced): { 'element:ready': ..., 'element:removed': ... } */
export type TPluginEventsFrom<P extends readonly IPluginDefinition[]> = P extends readonly [
	infer Head,
	...infer Tail,
]
	? Head extends IPluginDefinition<infer N, infer PE>
		? N extends string
			? Tail extends readonly IPluginDefinition[]
				? NamespacedEvents<PE, N> & TPluginEventsFrom<Tail>
				: NamespacedEvents<PE, N>
			: Tail extends readonly IPluginDefinition[]
				? TPluginEventsFrom<Tail>
				: {}
		: {}
	: {}

/** Все события дескриптора (свои + плагинные, namespaced): DescriptorAllEvents<typeof ButtonDescriptor> → TButtonEvents & { 'element:ready': ... } */
export type DescriptorAllEvents<T> = DescriptorEvents<T> & TPluginEventsFrom<DescriptorPlugins<T>>
