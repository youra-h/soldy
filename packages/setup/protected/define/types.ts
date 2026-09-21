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

import type { IContribution, IPropDefinition, ISlotDefinition } from './contribution.types'
import type { TName } from './name.class'
import type { TPropSpec } from './prop-spec.class'
import type { TSlotDeclaration } from './slot-declaration.class'
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
 * Объявление, которое наследуется: проп, слот и определение плагина.
 *
 * Наследование у всех трёх одно: своё объявление ложится на одноимённое
 * родительское и остаётся на его месте (`inheritDeclarations`). Различается
 * только смысл слова «поверх», и знает его само объявление, а не тот, кто
 * складывает списки: проп переобъявляет написанные факты
 * (`TPropSpec.inheritFrom`), слот и плагин встают целиком — scope объявляют
 * одним местом, опции задаёт место установки.
 *
 * Поэтому у дескриптора нет ни ветки на категорию, ни функции извлечения
 * ключа: новая категория объявлений приносит своё правило с собой.
 */
export interface IDeclaration<T> {
	/** Одно объявление на ключ: полное имя пропа, имя слота, класс плагина. */
	readonly key: unknown
	/** Своё поверх родительского. Результат — новое объявление; оба исходных не меняются. */
	inheritFrom(base: T): T
}

/**
 * Что плагины добавляют компоненту в типах, уже под именами с неймспейсом:
 * `aria_label`, `element:ready`, `layout_styles`. У одного плагина это часть
 * его контракта, у компонента — сумма по всем плагинам дескриптора.
 */
export interface IPluginsContract {
	/** Входы — незащищённые пропсы, их пишет потребитель. */
	props: object
	/** События, которые плагин публикует: `events` и триггеры пропсов. */
	events: object
	/** Выходы — защищённые пропсы: их вычисляет плагин, разметка только читает. */
	outputs: object
}

/**
 * Контракт плагина в типах. Выводит его `definePlugin` из класса плагина и его
 * contribution; руками контракт не пишут.
 */
export interface IPluginContract extends IPluginsContract {
	/** Опции установки — второй параметр `install()` класса плагина. */
	options: object
}

/**
 * Определение плагина: его контракт и, в составе дескриптора, опции установки.
 *
 * Контракт — свойство класса плагина, и объявляют его один раз, константой.
 * Опции — свойство места, где плагин поставили: дескриптор берёт определение
 * как есть или с опциями — `DismissPluginDescriptor.with({ focusOutside: true })`.
 */
export interface IPluginDefinition<
	C extends IPluginContract = IPluginContract,
> extends IDeclaration<IPluginDefinition<C>> {
	/** Фантомное поле: в рантайме его нет, оно только несёт контракт в типе. */
	readonly __contract?: C
	readonly ctor: TPluginCtor
	/** Ключ наследования — класс плагина: дважды один класс компоненту не ставят. */
	readonly key: TPluginCtor
	/** Нормализованные props из contribution, с умолчаниями. */
	readonly props: readonly TPropSpec[]
	/** Нормализованные events из contribution */
	readonly events: readonly TName[]
	/** Опции, передаваемые в plugin.install(ctx, options) */
	readonly options?: object
	/** Namespace плагина. */
	readonly namespace?: string
	/** Те же пропсы и события — в форме, общей с дескриптором: по ней строится поверхность. */
	getProps(): readonly TPropSpec[]
	getEvents(): readonly TName[]
	/**
	 * То же определение с опциями установки. Исходное не меняется: его делят
	 * все дескрипторы, которые плагин ставят. Умолчания пропсов пересчитываются —
	 * заданная опция идёт впереди `defaultValues` класса.
	 */
	with(options: C['options']): IPluginDefinition<C>
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
	/**
	 * Имена защищённых пропсов — свои поверх `extends`, как и в рантайме:
	 * наследник переобъявляет унаследованный проп в обе стороны, поэтому
	 * `protected: true` имя сюда добавляет, а объявление без него — убирает.
	 * Из пропсов компонента эти имена вычитаются (`DescriptorProps`): значение
	 * вычисляет владелец, входа у разметки нет.
	 */
	protectedName: string
	/** Слоты, имя → scope: свои поверх `extends`. */
	slots: object
	/** Сумма контрактов плагинов — своих и `extends`. */
	plugins: IPluginsContract
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
	readonly ctor: TComponentCtor<C['instance']>
	/** Own component props (excluding plugin props). */
	readonly props: readonly TPropSpec[]
	/** Own component events (excluding plugin events). */
	readonly events: readonly TName[]
	/**
	 * Слоты: свои + унаследованные. Плагины слотов не имеют, поэтому отдельного
	 * «полного» списка, как у пропсов и событий, у слотов нет.
	 */
	readonly slots: readonly TSlotDeclaration[]
	readonly plugins: readonly IPluginDefinition[]
	/** All props: own + all plugin props (flat). */
	getProps(): readonly TPropSpec[]
	/** All events: own + all plugin events (flat). */
	getEvents(): readonly TName[]
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
