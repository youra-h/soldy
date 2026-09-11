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

/** Определение плагина в составе дескриптора. */
export interface IPluginDefinition<
	N extends string | undefined = string | undefined,
	// Вытаскивается через infer в TPluginEventsUnion — линтер сквозь infer не видит.
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	TEvents extends object = object,
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
	/** Родительский дескриптор (наследование props, events, slots, plugins) */
	extends?: IComponentDescriptor<any, any, TParentPlugins, any>
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
> {
	ctor: any
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
