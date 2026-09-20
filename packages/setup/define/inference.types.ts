/**
 * Вывод типов: контракт плагина и компонента из их объявлений и типы для адаптеров из контракта.
 *
 * Фабрика дескриптора — единственный источник типов: адаптер не импортирует
 * интерфейсы пропсов и карты событий из ядра, а выводит их отсюда. Сам
 * дескриптор их тоже не повторяет: `defineComponent` берёт пропсы у класса
 * ядра (`ctor`), события — из его карты, суженной до имён, которые дескриптор
 * публикует, а слоты — из их объявления. У плагина так же: `definePlugin`
 * берёт типы пропсов и карту событий у класса плагина, а состав — у
 * contribution.
 */

import type { IEntity, TEvented } from '@soldy/core'
import type { TPluginInternalEvents } from '@soldy/plugins'
import type { TUnderscorePropName } from '../naming'
import type {
	IComponentDescriptor,
	IPluginDefinition,
	IPluginsContract,
	TEmptySlotScope,
	TPropType,
} from './types'

/* -------------------------------------------------------------------------- */
/* Инстанс: пропсы и события класса ядра или плагина                           */
/* -------------------------------------------------------------------------- */

/**
 * Пропсы инстанса — параметр `TProps` его сущности ядра (`IEntity<TProps>`):
 * интерфейс, который класс принимает конструктором и отдаёт `getProps()`.
 * Класс не из ядра — словарь без типа, как у дескриптора без `ctor` и `extends`.
 *
 * У дженерик-класса на месте параметра стоит его констрейнт, а не дефолт, как
 * и у самого инстанса: `IValueControlProps<unknown>` у `TValueControl`.
 */
type TInstanceProps<TInstance> =
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
type TInstanceEventName<TInstance> = TInstance extends {
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
type TPublishedEvents<TInstance, TName extends string> = TInstance extends {
	readonly events: TEvented<infer E>
}
	? Pick<E, Extract<TName, keyof E>>
	: object

/* -------------------------------------------------------------------------- */
/* Объявление: что из него читают оба вывода                                   */
/* -------------------------------------------------------------------------- */

/** Словарь `props` объявления; нет — пустой. */
type TDeclaredProps<TContribution> = TContribution extends {
	readonly props: infer P extends object
}
	? P
	: object

/** Имена событий объявления: `events` и триггеры пропсов. */
type TDeclaredEventName<TContribution> =
	| (TContribution extends { readonly events: readonly (infer E extends string)[] } ? E : never)
	| {
			[K in keyof TDeclaredProps<TContribution>]: TDeclaredProps<TContribution>[K] extends {
				readonly triggers: readonly (infer T extends string)[]
			}
				? T
				: never
	  }[keyof TDeclaredProps<TContribution>]

/* -------------------------------------------------------------------------- */
/* Вывод в definePlugin: контракт плагина из класса и contribution             */
/* -------------------------------------------------------------------------- */

/** Ключи защищённых пропсов объявления — выходы плагина. */
type TOutputKey<TProps> = {
	[K in keyof TProps]: TProps[K] extends { readonly protected: true } ? K : never
}[keyof TProps]

/**
 * Тип значения пропа плагина: что отдаёт его `get`, а без него — одноимённое
 * свойство класса. Ни того ни другого — типа нет.
 */
type TPluginPropValue<TInstance, TDefinition, K> = TDefinition extends {
	get(instance: never): infer TValue
}
	? TValue
	: K extends keyof TInstance
		? TInstance[K]
		: unknown

/** `{ label }` @ `aria` → `{ aria_label }` (naming — как в `underscorePropNaming`). */
type TNamespacedProps<T, N extends string | undefined> = {
	[K in keyof T as K extends string ? TUnderscorePropName<N, K> : never]: T[K]
}

/** `{ ready }` @ `element` → `{ 'element:ready' }` (формат — как у `TName.getName()`). */
type TNamespacedEvents<T, N extends string | undefined> = {
	[K in keyof T as K extends string ? (N extends string ? `${N}:${K}` : K) : never]: T[K]
}

/**
 * Карта плагина без внутренних событий базы (`install`, `destroy`).
 *
 * Наружу адаптер пробрасывает только события contribution плагина, а базовые
 * среди них задаёт `PLUGIN_EVENTS`. Внутренние выведены из того же списка
 * (`TPluginInternalEvents`), поэтому плагинные события в типах дескриптора не
 * обещают того, что не придёт: `action:install` нет ни в них, ни в рантайме.
 */
type TPublicPluginEvents<TInstance> = Omit<TInstanceEvents<TInstance>, keyof TPluginInternalEvents>

/** Опции установки — второй параметр `install()` класса; не объявлен — любой объект. */
type TPluginOptions<TInstance> = TInstance extends {
	install(ctx: never, options?: infer TOptions extends object): void
}
	? TOptions
	: object

/**
 * Контракт плагина: состав — из contribution, типы — из класса.
 *
 * Входы — незащищённые пропсы, выходы — защищённые, события — карта класса,
 * суженная до опубликованных имён, как у компонента (`TPublishedEvents`).
 * Второй записи пропсов и событий рядом с объявлением нет.
 */
export type TPluginContractFrom<TInstance, N extends string | undefined, TContribution> = {
	options: TPluginOptions<TInstance>
	props: TNamespacedProps<
		{
			-readonly [K in Exclude<
				keyof TDeclaredProps<TContribution>,
				TOutputKey<TDeclaredProps<TContribution>>
			>]?: TPluginPropValue<TInstance, TDeclaredProps<TContribution>[K], K>
		},
		N
	>
	events: TNamespacedEvents<
		Pick<
			TPublicPluginEvents<TInstance>,
			Extract<TDeclaredEventName<TContribution>, keyof TPublicPluginEvents<TInstance>>
		>,
		N
	>
	outputs: TNamespacedProps<
		{
			readonly [K in TOutputKey<TDeclaredProps<TContribution>>]: TPluginPropValue<
				TInstance,
				TDeclaredProps<TContribution>[K],
				K
			>
		},
		N
	>
}

/* -------------------------------------------------------------------------- */
/* Вывод в defineComponent: контракт компонента из его опций                   */
/* -------------------------------------------------------------------------- */

/** Контракт дескриптора без `extends`: ни инстанса, ни имён, ни слотов, ни плагинов. */
type TRootContract = {
	instance: object
	eventName: never
	slots: object
	plugins: { props: object; events: object; outputs: object }
}

/** Контракт родителя из `extends`; нет — корневой. */
type TParentContract<TOptions> = TOptions extends {
	readonly extends: IComponentDescriptor<infer C>
}
	? C
	: TRootContract

/** Инстанс — из своего `ctor`, а без него родительский. */
type TOptionsInstance<TOptions> = TOptions extends {
	readonly ctor: new (...args: any[]) => infer TInstance extends object
}
	? TInstance
	: TParentContract<TOptions>['instance']

type TOptionsContribution<TOptions> = TOptions extends { readonly contribution: infer C }
	? C
	: object

/** Scope слота из объявления: `defineType<T>` даёт `T`, слот без scope — `TEmptySlotScope`. */
type TSlotScope<TSlot> = TSlot extends {
	readonly scope: infer TScope extends Readonly<Record<string, TPropType<unknown>>>
}
	? { -readonly [K in keyof TScope]: TScope[K] extends TPropType<infer T> ? T : never }
	: TEmptySlotScope

/** Слоты из объявления `contribution.slots`: имя слота → его scope. */
type TDeclaredSlots<TContribution> = TContribution extends { readonly slots: infer S }
	? { -readonly [K in keyof S]: TSlotScope<S[K]> }
	: object

/**
 * Слоты наследника: родительские, перекрытые одноимёнными своими, — как в
 * рантайме (`TComponentDescriptor`). Так Button уточняет `default`,
 * объявленный у ComponentView: добавляет scope `text`.
 */
type TMergeSlots<TParent extends object, TOwn extends object> = {
	[K in keyof TParent | keyof TOwn]: K extends keyof TOwn
		? TOwn[K]
		: K extends keyof TParent
			? TParent[K]
			: never
}

/** Объединение → пересечение: сумма частей контрактов всех плагинов списка. */
type TIntersection<TUnion> = (TUnion extends unknown ? (part: TUnion) => void : never) extends (
	part: infer TPart,
) => void
	? TPart
	: never

/** Одна часть контракта (`props`, `events`, `outputs`) у всех плагинов списка разом. */
type TPluginsPart<TPlugin, K extends keyof IPluginsContract> = [TPlugin] extends [never]
	? object
	: TIntersection<
				TPlugin extends IPluginDefinition<infer C> ? C[K] : never
		  > extends infer TPart extends object
		? TPart
		: object

/** Сумма контрактов своих плагинов из `plugins`. */
type TOptionsPlugins<TOptions> = TOptions extends { readonly plugins: readonly (infer TPlugin)[] }
	? {
			props: TPluginsPart<TPlugin, 'props'>
			events: TPluginsPart<TPlugin, 'events'>
			outputs: TPluginsPart<TPlugin, 'outputs'>
		}
	: { props: object; events: object; outputs: object }

/** Контракт дескриптора из опций `defineComponent`: своё поверх родительского. */
export type TContractFrom<TOptions> = {
	instance: TOptionsInstance<TOptions>
	eventName:
		| TParentContract<TOptions>['eventName']
		| TDeclaredEventName<TOptionsContribution<TOptions>>
	slots: TMergeSlots<
		TParentContract<TOptions>['slots'],
		TDeclaredSlots<TOptionsContribution<TOptions>>
	>
	plugins: {
		props: TParentContract<TOptions>['plugins']['props'] & TOptionsPlugins<TOptions>['props']
		events: TParentContract<TOptions>['plugins']['events'] & TOptionsPlugins<TOptions>['events']
		outputs: TParentContract<TOptions>['plugins']['outputs'] &
			TOptionsPlugins<TOptions>['outputs']
	}
}

/**
 * Сверка имён событий: `events` и триггеры своих пропсов — ключи карты событий
 * инстанса. Опечатка в триггере или событие, которого класс не шлёт, — ошибка
 * компиляции дескриптора. Имена родителя приходят из `extends` готовыми: их
 * сверил родитель, если у него был класс ядра. У родителя без класса
 * (`EntityDescriptor`, `CollectionDescriptor`) их сверить было не с чем, и
 * карту к ним прикладывает наследник.
 */
export type TCheckedEventNames<TOptions> = {
	readonly contribution?: {
		readonly events?: readonly TInstanceEventName<TOptionsInstance<TOptions>>[]
		readonly props?: {
			readonly [K in keyof TDeclaredProps<TOptionsContribution<TOptions>>]?: {
				readonly triggers?: readonly TInstanceEventName<TOptionsInstance<TOptions>>[]
			}
		}
	}
}

/* -------------------------------------------------------------------------- */
/* Типы для адаптеров: из фабрики дескриптора (единственный source of truth)   */
/* -------------------------------------------------------------------------- */

/** Контракт по фабрике дескриптора (`typeof ButtonDescriptor`) или по самому дескриптору. */
export type TContractOf<T> = T extends (...args: any[]) => IComponentDescriptor<infer C>
	? C
	: T extends IComponentDescriptor<infer C>
		? C
		: never

/** Инстанс дескриптора: DescriptorInstance<typeof ButtonDescriptor> → TButton */
export type DescriptorInstance<T> = TContractOf<T>['instance']

/** Props компонента из дескриптора: DescriptorProps<typeof ButtonDescriptor> → IButtonProps */
export type DescriptorProps<T> = TInstanceProps<DescriptorInstance<T>>

/**
 * Собственные события компонента (БЕЗ плагинных) — только опубликованные:
 * DescriptorEvents<typeof ButtonDescriptor> → Pick<TButtonEvents, 'change:text' | 'show' | …>.
 * Событие класса, которого нет ни в `events`, ни в триггерах (`change:present`), сюда не входит.
 */
export type DescriptorEvents<T> = TPublishedEvents<
	DescriptorInstance<T>,
	TContractOf<T>['eventName']
>

/**
 * Все события дескриптора — свои опубликованные и плагинные (namespaced):
 * DescriptorAllEvents<typeof ButtonDescriptor> → DescriptorEvents<…> & { 'element:ready': ... }.
 * Из неё React, Solid и Svelte выводят колбэк-пропы, поэтому в ней только то, что адаптер пробрасывает.
 */
export type DescriptorAllEvents<T> = DescriptorEvents<T> & TContractOf<T>['plugins']['events']

/** Все пропсы дескриптора (свои + плагинные, namespaced): DescriptorAllProps<typeof ButtonDescriptor> → IButtonProps & { aria_label?: ... } */
export type DescriptorAllProps<T> = DescriptorProps<T> & TContractOf<T>['plugins']['props']

/**
 * Выходы плагинов дескриптора — защищённые пропсы, которые плагины отдают
 * разметке: DescriptorPluginOutputs<typeof FrameDescriptor> → { layout_styles: ... }
 *
 * Только плагинные, без «All»: свои выходы компонента (`classes`, `aria`) —
 * геттеры инстанса, и их тип адаптер берёт у него (`TInstanceState`).
 */
export type DescriptorPluginOutputs<T> = TContractOf<T>['plugins']['outputs']

/**
 * Слоты дескриптора, имя → scope:
 * DescriptorSlots<typeof ButtonDescriptor> → { leading: TEmptySlotScope; default: { text: string }; trailing: TEmptySlotScope }
 */
export type DescriptorSlots<T> = TContractOf<T>['slots']
