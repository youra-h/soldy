/**
 * Типы для ComponentDescriptor.
 * Работают через TAccessor: Unit = { instance, props, events }.
 */

import type {
	IContribution,
	IPropDeclaration,
	ISlotDeclaration,
	TAccessor,
	TName,
} from '@soldy/accessor'
import type { IPluginBundle, IPluginConstructor } from '@soldy/plugins'
import type { TUnderscorePropName } from '../../common'

/**
 * Конструктор инстанса компонента.
 *
 * Параметры стёрты: пропсы и опции приходят от фреймворка в рантайме, и сверять
 * их здесь не с чем. Тип инстанса не стёрт — его дескриптор несёт дальше, в
 * `IAdapterContext<TInstance>` (см. AGENTS.md, «`any`: где он честный»).
 *
 * `defaultValues` — статика класса ядра (`TComponentView.defaultValues`): из неё
 * `defineComponent` собирает умолчания пропов в декларации. Объявлена в типе,
 * чтобы читать её без рефлексии; у класса без статики её просто нет.
 */
export type TComponentCtor<TInstance extends object = object> = (new (
	...args: any[]
) => TInstance) & {
	readonly defaultValues?: Readonly<Record<string, unknown>>
}

/** Инстанс дескриптора: из своего `ctor`, а без него — унаследованный от `extends`. */
export type TResolveInstance<TOwn extends object, TParent extends object> = [TOwn] extends [never]
	? TParent
	: TOwn

/** Определение плагина в составе дескриптора. */
export interface IPluginDefinition<
	N extends string | undefined = string | undefined,
	// Вытаскиваются через infer в TPluginEventsFrom/TPluginPropsFrom — линтер
	// сквозь infer их не видит.
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	TEvents extends object = object,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	TProps extends object = object,
> {
	ctor: IPluginConstructor<any, any, any>
	/** Нормализованные props из contribution */
	props: IPropDeclaration[]
	/** Нормализованные events из contribution */
	events: TName[]
	/** Опции, передаваемые в plugin.install(ctx, options) */
	options?: object
	/** Namespace плагина (проброшен из definePlugin для вывода типов в адаптерах). */
	namespace?: N
}

/** Опции для defineComponent(). */
export interface IComponentDefinitionOptions<
	TPlugins extends readonly IPluginDefinition[] = readonly [],
	TParentPlugins extends readonly IPluginDefinition[] = readonly [],
	TInstance extends object = never,
	TParentInstance extends object = object,
> {
	/** Конструктор core-компонента. Без него инстанс наследуется от `extends`. */
	ctor?: TComponentCtor<TInstance>
	/** Родительский дескриптор (наследование props, events, slots, plugins) */
	extends?: IComponentDescriptor<any, any, TParentPlugins, any, TParentInstance>
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
	/*
	 * Все четыре параметра вытаскиваются через infer в DescriptorProps,
	 * DescriptorEvents, DescriptorPlugins и DescriptorSlots ниже по файлу —
	 * ради этого дескриптор и параметризован. В теле они не упоминаются, и
	 * сквозь infer линтер их не видит.
	 */
	/* eslint-disable @typescript-eslint/no-unused-vars */
	TProps extends object = Record<string, unknown>,
	TEvents extends object = object,
	TPlugins extends readonly IPluginDefinition[] = readonly [],
	TSlots extends object = object,
	/* eslint-enable @typescript-eslint/no-unused-vars */
	/** Тип инстанса, который строит `ctor`; уходит в `IAdapterContext<TInstance>`. */
	TInstance extends object = object,
> {
	ctor: TComponentCtor<TInstance>
	/** Own component props (excluding plugin props). */
	props: IPropDeclaration[]
	/** Own component events (excluding plugin events). */
	events: TName[]
	/** Слоты: свои + унаследованные. Плагины слотов не имеют. */
	slots: ISlotDeclaration[]
	plugins: IPluginDefinition[]
	/** All props: own + all plugin props (flat). */
	getProps(): IPropDeclaration[]
	/** All events: own + all plugin events (flat). */
	getEvents(): TName[]
	/** Слоты компонента. Отдельного «плагинного» источника у них нет. */
	getSlots(): ISlotDeclaration[]

	createBundle(instance: TInstance): IPluginBundle | null
	/** Создаёт TAccessor: Unit'ы из instance и plugin instances */
	createAccessor(instance: TInstance, bundle: IPluginBundle | null): TAccessor
}

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
