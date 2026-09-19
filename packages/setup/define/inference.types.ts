/**
 * Вывод типов из дескриптора для адаптеров: пропсы, события, плагины, их выходы и слоты компонента.
 *
 * Фабрика дескриптора — единственный источник типов: адаптер не импортирует
 * интерфейсы пропсов и карты событий из ядра, а выводит их отсюда. Сам
 * дескриптор их тоже не повторяет: `defineComponent` берёт пропсы у класса
 * ядра (`ctor`), события — из его карты, суженной до имён, которые дескриптор
 * публикует, а слоты — из их объявления.
 */

import type { IEntity, TEvented } from '@soldy/core'
import type { TPluginInternalEvents } from '@soldy/plugins'
import type { TUnderscorePropName } from '../naming'
import type {
	IComponentDescriptor,
	IPluginDefinition,
	TEmptySlotScope,
	TPropType,
	TSlotDefinitions,
} from './types'

/* -------------------------------------------------------------------------- */
/* Вывод в defineComponent: типы дескриптора из его опций                      */
/* -------------------------------------------------------------------------- */

/**
 * Пропсы инстанса — параметр `TProps` его сущности ядра (`IEntity<TProps>`):
 * интерфейс, который класс принимает конструктором и отдаёт `getProps()`.
 * Класс не из ядра — словарь без типа, как у дескриптора без `ctor` и `extends`.
 *
 * У дженерик-класса на месте параметра стоит его констрейнт, а не дефолт, как
 * и у самого инстанса: `IValueControlProps<unknown>` у `TValueControl`.
 */
export type TInstanceProps<TInstance> =
	TInstance extends IEntity<infer P extends object> ? P : Record<string, unknown>

/** События инстанса — карта его шины (`events: TEvented<TEvents>`); шины нет — событий нет. */
export type TInstanceEvents<TInstance> = TInstance extends {
	readonly events: TEvented<infer E>
}
	? E
	: object

/**
 * Имя, которое дескриптор может объявить в `events` и `triggers`, — ключ карты
 * событий инстанса. Шины нет (`EntityDescriptor` и `CollectionDescriptor` без
 * класса ядра) — сверять не с чем, и имя любое: карту даст наследник.
 */
export type TInstanceEventName<TInstance> = TInstance extends {
	readonly events: TEvented<infer E>
}
	? Extract<keyof E, string>
	: string

/**
 * События, которые дескриптор публикует: карта инстанса, суженная до имён из
 * `events` и триггеров пропсов — своих и `extends`.
 *
 * Наружу адаптер пробрасывает только эти имена (`exportEvents` поверхности), а
 * карта класса шире: `change:present` у ComponentView ядро шлёт, но ни в
 * `events`, ни в триггерах его нет. Тип, выведенный из всей карты, обещал бы
 * колбэк, который адаптер не вызовет никогда. Шины нет — событий нет.
 */
export type TPublishedEvents<TInstance, TName extends string> = TInstance extends {
	readonly events: TEvented<infer E>
}
	? Pick<E, Extract<TName, keyof E>>
	: object

/** Scope слота из объявления: `defineType<T>` даёт `T`, слот без scope — `TEmptySlotScope`. */
type TSlotScopeOf<TSlot> = TSlot extends {
	readonly scope: infer TScope extends Record<string, TPropType<unknown>>
}
	? { [K in keyof TScope]: TScope[K] extends TPropType<infer T> ? T : never }
	: TEmptySlotScope

/** Слоты из объявления `contribution.slots`: имя слота → его scope. */
export type TSlotsOf<TSlots extends TSlotDefinitions> = {
	[K in keyof TSlots]: TSlotScopeOf<TSlots[K]>
}

/**
 * Слоты наследника: родительские, перекрытые одноимёнными своими, — как
 * `mergeSlots` в рантайме (`inherit.ts`). Так Button уточняет `default`,
 * объявленный у ComponentView: добавляет scope `text`.
 */
export type TMergeSlots<TParent extends object, TOwn extends object> = {
	[K in keyof TParent | keyof TOwn]: K extends keyof TOwn
		? TOwn[K]
		: K extends keyof TParent
			? TParent[K]
			: never
}

/* -------------------------------------------------------------------------- */
/* Extractors: вывод типов из фабрики дескриптора (единственный source of truth) */
/* -------------------------------------------------------------------------- */

/** Тип инстанса дескриптора: TDescriptorInstance<typeof ButtonDescriptor> → IComponentDescriptor<...> */
export type TDescriptorInstance<T> = T extends (...args: any[]) => infer R ? R : never

/** Props компонента из дескриптора: DescriptorProps<typeof ButtonDescriptor> → IButtonProps */
export type DescriptorProps<T> =
	TDescriptorInstance<T> extends IComponentDescriptor<infer P, any, any, any> ? P : never

/**
 * Собственные события компонента (БЕЗ плагинных) — только опубликованные:
 * DescriptorEvents<typeof ButtonDescriptor> → Pick<TButtonEvents, 'change:text' | 'show' | …>.
 * Событие класса, которого нет ни в `events`, ни в триггерах (`change:present`), сюда не входит.
 */
export type DescriptorEvents<T> =
	TDescriptorInstance<T> extends IComponentDescriptor<any, infer E, any, any> ? E : never

/** Список плагинов дескриптора (tuple): DescriptorPlugins<typeof ButtonDescriptor> → readonly [ElementDef, ReadyDef] */
export type DescriptorPlugins<T> =
	TDescriptorInstance<T> extends IComponentDescriptor<any, any, infer P, any> ? P : readonly []

/**
 * Слоты дескриптора, имя → scope:
 * DescriptorSlots<typeof ButtonDescriptor> → { leading: TEmptySlotScope; default: { text: string }; trailing: TEmptySlotScope }
 */
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

/**
 * Все события дескриптора — свои опубликованные и плагинные (namespaced):
 * DescriptorAllEvents<typeof ButtonDescriptor> → DescriptorEvents<…> & { 'element:ready': ... }.
 * Из неё React, Solid и Svelte выводят колбэк-пропы, поэтому в ней только то, что адаптер пробрасывает.
 */
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

/** Выходы всех плагинов дескриптора (namespaced): { dismiss_ownerAttribute: ..., layout_styles: ... } */
export type TPluginOutputsFrom<P extends readonly IPluginDefinition[]> = P extends readonly [
	infer Head,
	...infer Tail,
]
	? Head extends IPluginDefinition<infer N, any, any, infer PO>
		? N extends string
			? Tail extends readonly IPluginDefinition[]
				? NamespacedProps<PO, N> & TPluginOutputsFrom<Tail>
				: NamespacedProps<PO, N>
			: Tail extends readonly IPluginDefinition[]
				? TPluginOutputsFrom<Tail>
				: object
		: object
	: object

/**
 * Выходы плагинов дескриптора — защищённые пропсы, которые плагины отдают
 * разметке: DescriptorPluginOutputs<typeof FrameDescriptor> → { layout_styles: ... }
 *
 * Только плагинные, без «All»: свои выходы компонента (`classes`, `aria`) —
 * геттеры инстанса, и их тип адаптер берёт у него (`TInstanceState`).
 */
export type DescriptorPluginOutputs<T> = TPluginOutputsFrom<DescriptorPlugins<T>>
