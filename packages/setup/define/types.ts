/**
 * Контракт дескриптора компонента и определения плагина.
 *
 * Дескриптор отдаёт декларации: props, events, slots и состав плагинов
 * библиотеки. Собирает по ним компонент сборка (`assemble/`).
 *
 * Типы едут одним параметром — контрактом (`IComponentContract`,
 * `IPluginContract`): что адаптеру нужно знать о компоненте в типах, лежит в
 * нём по ключам. Новый факт — новый ключ, сигнатуры функций над дескриптором
 * при этом не меняются.
 */

import type {
	IContribution,
	IPropDeclaration,
	IPropDefinition,
	ISlotDeclaration,
	ISlotDefinition,
	TName,
} from '@soldy/accessor'
import type { IPluginConstructor } from '@soldy/plugins'

/**
 * Конструктор инстанса компонента.
 *
 * Параметры стёрты: пропсы и опции приходят от фреймворка в рантайме, и сверять
 * их здесь не с чем. Тип инстанса не стёрт — его дескриптор несёт дальше, в
 * контракте (см. AGENTS.md, «`any`: где он честный»), и из него же выводятся
 * типы пропсов и событий (`TInstanceProps`, `TInstanceEvents`).
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

/** Класс плагина. Параметры стёрты по той же причине, что у `TComponentCtor`. */
export type TPluginCtor = IPluginConstructor<any, any, any>

/**
 * Контракт плагина в типах — то, что он добавляет компоненту, уже под именами
 * с неймспейсом: `aria_label`, `element:ready`, `layout_styles`.
 *
 * Выводит его `definePlugin` из класса плагина и его contribution; руками
 * контракт не пишут.
 */
export interface IPluginContract {
	/** Входы — незащищённые пропсы, их пишет потребитель. */
	props: object
	/** События, которые плагин публикует: `events` и триггеры пропсов. */
	events: object
	/** Выходы — защищённые пропсы: их вычисляет плагин, разметка только читает. */
	outputs: object
}

/** Определение плагина в составе дескриптора. */
export interface IPluginDefinition<C extends IPluginContract = IPluginContract> {
	/** Фантомное поле: в рантайме его нет, оно только несёт контракт в типе. */
	readonly __contract?: C
	ctor: TPluginCtor
	/** Нормализованные props из contribution */
	props: IPropDeclaration[]
	/** Нормализованные events из contribution */
	events: TName[]
	/** Опции, передаваемые в plugin.install(ctx, options) */
	options?: object
	/** Namespace плагина. */
	namespace?: string
}

/**
 * Объявление слота в опциях `defineComponent`.
 *
 * Уже `ISlotDefinition` аксессора: там scope — любой словарь, рантайму нужен
 * только состав ключей. Здесь значение scope — `defineType<T>`, и из него
 * выводится тип данных слота (`DescriptorSlots`). Значение без типа (`String`)
 * поэтому не компилируется, а не превращается в `unknown` в типах адаптеров.
 */
export interface IComponentSlotDefinition extends ISlotDefinition {
	readonly scope?: Readonly<Record<string, TPropType<unknown>>>
}

/** Слоты в опциях `defineComponent`: имя слота — ключ словаря, как у `slots` в `IContribution`. */
export type TSlotDefinitions = Readonly<Record<string, IComponentSlotDefinition>>

/**
 * Проп в contribution компонента: то же, что `IPropDefinition`, но триггер —
 * имя события, которое дескриптор публикует.
 *
 * Триггеры адаптер пробрасывает наружу — и у protected-пропа тоже, — поэтому
 * их имена вместе с `events` и составляют события компонента в типах
 * (`DescriptorEvents`). Сверяет их `defineComponent`: у дескриптора с классом
 * ядра имя вне его карты событий не компилируется. Параметр нужен общим
 * наборам пропсов (`LIST_PROPS`): они сверяют триггеры со своей картой сами.
 */
export interface IComponentPropDefinition<
	TEventName extends string = string,
> extends IPropDefinition {
	readonly triggers?: readonly TEventName[]
}

/** Contribution компонента: то же, что `IContribution`, но у слотов scope с типами. */
export interface IComponentContribution extends IContribution {
	readonly props?: Readonly<Record<string, IComponentPropDefinition>>
	readonly slots?: TSlotDefinitions
}

/**
 * Опции для defineComponent().
 *
 * Тип опций `defineComponent` запоминает целиком, литералом, и выводит из него
 * контракт дескриптора (`TContractFrom`): инстанс — из `ctor`, а без него из
 * `extends`; имена событий — из `events` и триггеров пропсов; слоты — из их
 * объявления; плагины — из `plugins`; всё родительское — из `extends`.
 */
export interface IComponentOptions {
	/** Конструктор core-компонента. Без него инстанс наследуется от `extends`. */
	readonly ctor?: TComponentCtor
	/** Родительский дескриптор (наследование props, events, slots, plugins) */
	readonly extends?: IComponentDescriptor
	/** Собственная контрибуция компонента */
	readonly contribution?: IComponentContribution
	/** Плагины (каждый — результат definePlugin) */
	readonly plugins?: readonly IPluginDefinition[]
}

/** Контекст сборки набора: что знает о компоненте тот, кто его собирает. */
export interface IBundleContext {
	/** Имя места во вложенной разметке; нет — компонент поставил пользователь. */
	embedded?: string
}

/**
 * Контракт компонента в типах — всё, что адаптер выводит из дескриптора.
 *
 * Здесь только то, чего не вывести из остального: пропсы и карта событий —
 * свойства инстанса (`TInstanceProps`, `TInstanceEvents`), поэтому отдельных
 * ключей у них нет. Руками контракт не пишут: его выводит `defineComponent`.
 */
export interface IComponentContract {
	/** Инстанс, который строит `ctor`. */
	instance: object
	/**
	 * Опубликованные имена событий — `events` и триггеры пропсов, свои и
	 * `extends`. До них сужается карта событий инстанса. Нужны отдельно от
	 * карты: у дескриптора без класса ядра (`EntityDescriptor`,
	 * `CollectionDescriptor`) карты нет, а имена есть, и карту к ним
	 * прикладывает наследник. `string` — имена неизвестны, то есть любые.
	 */
	eventName: string
	/** Слоты, имя → scope: свои поверх `extends`. */
	slots: object
	/** Сумма контрактов плагинов — своих и `extends`. */
	plugins: IPluginContract
}

/**
 * Дескриптор компонента — единственный источник истины.
 *
 * Контракт `C` — фантом: в рантайме его нет, но из него адаптеры выводят типы
 * прямо из фабрики дескриптора (`DescriptorAllProps<typeof ButtonDescriptor>`
 * → `IButtonProps & { aria_label?: … }`).
 */
export interface IComponentDescriptor<C extends IComponentContract = IComponentContract> {
	/** Фантомное поле: в рантайме его нет, оно только несёт контракт в типе. */
	readonly __contract?: C
	ctor: TComponentCtor<C['instance']>
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
}

/**
 * Значение scope слота: конструктор для рантайма и фантомный `T` — тип данных,
 * которые получает слот (из него `DescriptorSlots` выводит scope). Собирает его
 * `defineType`.
 *
 * Имя осталось от пропсов, но у пропа такой записи нет: тип его значения даёт
 * интерфейс пропсов ядра, а `type` декларации — голый конструктор.
 */
export type TPropType<T> = {
	/**
	 * Фантомное поле: в рантайме его нет, оно только несёт `T` в типе.
	 * Необязательное, поэтому `defineType` собирает значение без приведения.
	 */
	readonly __type?: T
	/** JS-конструктор значения: `String`, `Object`, … Рантайму слота нужны лишь ключи scope. */
	readonly ctor: unknown
}

/**
 * Scope слота, который ничего не передаёт внутрь.
 *
 * Именно `object`, а не `Record<string, never>`: адаптеры отличают слот без
 * scope по `keyof S extends never` (см. TSnippetSlots в ui/svelte). У
 * `Record<string, never>` есть индексная сигнатура, поэтому его `keyof` —
 * это `string`, и проверка ломается: сниппет начинает требовать аргумент.
 * У `object` же `keyof` пуст, как и у прежнего `{}`, но без его дыры,
 * пропускавшей `0` и `""`.
 */
export type TEmptySlotScope = object
