/**
 * Контракт дескриптора компонента и определения плагина.
 *
 * Дескриптор отдаёт декларации: props, events, slots и состав плагинов
 * библиотеки. Собирает по ним компонент сборка (`assemble/`).
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
 * `IAdapterContext<TInstance>` (см. AGENTS.md, «`any`: где он честный»), и из
 * него же выводит типы пропсов и событий (`TInstanceProps`, `TInstanceEvents`).
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

/**
 * Определение плагина в составе дескриптора.
 *
 * Три фантомных параметра — типы contribution без неймспейса: карта событий,
 * входы (незащищённые пропсы, их пишет потребитель) и выходы (защищённые, их
 * вычисляет плагин, а разметка только читает). Выход — геттер плагина, как
 * выход компонента — геттер инстанса, поэтому его тип — `Pick` класса
 * плагина (`Pick<TDismissPlugin, 'ownerAttribute'>`), а не второй интерфейс.
 */
export interface IPluginDefinition<
	N extends string | undefined = string | undefined,
	// Вытаскиваются через infer в TPluginEventsFrom/TPluginPropsFrom/
	// TPluginOutputsFrom — линтер сквозь infer их не видит.
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	TEvents extends object = object,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	TProps extends object = object,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	TOutputs extends object = object,
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

/**
 * Объявление слота в опциях `defineComponent`.
 *
 * Уже `ISlotDefinition` аксессора: там scope — любой словарь, рантайму нужен
 * только состав ключей. Здесь значение scope — `defineType<T>`, и из него
 * выводится тип данных слота (`DescriptorSlots`). Значение без типа (`String`)
 * поэтому не компилируется, а не превращается в `unknown` в типах адаптеров.
 */
export interface IComponentSlotDefinition extends ISlotDefinition {
	scope?: Record<string, TPropType<unknown>>
}

/** Слоты в опциях `defineComponent`: имя слота — ключ словаря, как у `slots` в `IContribution`. */
export type TSlotDefinitions = Record<string, IComponentSlotDefinition>

/**
 * Проп в contribution компонента: то же, что `IPropDefinition`, но триггер —
 * имя события, которое дескриптор публикует.
 *
 * Триггеры адаптер пробрасывает наружу — и у protected-пропа тоже, — поэтому
 * их имена вместе с `events` и составляют события компонента в типах
 * (`DescriptorEvents`). Сверяет их `defineComponent`: у дескриптора с классом
 * ядра имя вне его карты событий не компилируется.
 */
export interface IComponentPropDefinition<
	TEventName extends string = string,
> extends IPropDefinition {
	triggers?: TEventName[]
}

/**
 * Contribution компонента: то же, что `IContribution`, но у слотов scope с
 * типами, а события и триггеры пропсов — имена, которые `defineComponent`
 * запоминает в типе дескриптора (`TEventName`).
 */
export interface IComponentContribution<
	TSlots extends TSlotDefinitions = TSlotDefinitions,
	TEventName extends string = string,
> extends IContribution {
	props?: Record<string, IComponentPropDefinition<TEventName>>
	events?: TEventName[]
	slots?: TSlots
}

/**
 * Опции для defineComponent().
 *
 * Параметры руками не передаются — их выводит `defineComponent` из самих
 * опций: кортеж плагинов из `plugins`, объявление слотов из
 * `contribution.slots`, имена событий из `contribution.events` и триггеров
 * пропсов, плагины, слоты, инстанс и имена событий родителя из `extends`, свой
 * инстанс из `ctor`. Без `ctor` инстанс — родительский (дефолт `TInstance`).
 */
export interface IComponentDefinitionOptions<
	TPlugins extends readonly IPluginDefinition[] = readonly [],
	TSlots extends TSlotDefinitions = Record<never, never>,
	TParentPlugins extends readonly IPluginDefinition[] = readonly [],
	TParentSlots extends object = object,
	TParentInstance extends object = object,
	TInstance extends object = TParentInstance,
	TParentEventName extends string = never,
	TEventName extends string = never,
> {
	/** Конструктор core-компонента. Без него инстанс наследуется от `extends`. */
	ctor?: TComponentCtor<TInstance>
	/** Родительский дескриптор (наследование props, events, slots, plugins) */
	extends?: IComponentDescriptor<
		any,
		any,
		TParentPlugins,
		TParentSlots,
		TParentInstance,
		TParentEventName
	>
	/** Собственная контрибуция компонента */
	contribution?: IComponentContribution<TSlots, TEventName>
	/** Плагины (каждый — результат definePlugin) */
	plugins?: readonly [...TPlugins]
}

/** Опции без привязки к конкретному составу плагинов, слотов, инстансу и именам событий — для реализации. */
export type TDefinitionOptions = IComponentDefinitionOptions<
	readonly IPluginDefinition[],
	TSlotDefinitions,
	readonly IPluginDefinition[],
	object,
	object,
	object,
	string,
	string
>

/** Контекст сборки набора: что знает о компоненте тот, кто его собирает. */
export interface IBundleContext {
	/** Имя места во вложенной разметке; нет — компонент поставил пользователь. */
	embedded?: string
}

/**
 * Дескриптор компонента — единственный источник истины.
 *
 * TProps/TEvents/TPlugins/TSlots/TEventName — фантомные параметры: в рантайме
 * не используются, но позволяют адаптерам выводить типы прямо из фабрики
 * дескриптора (DescriptorProps<typeof ButtonDescriptor> → IButtonProps). Руками
 * их не задают: `defineComponent` выводит пропсы из класса ядра (`ctor`),
 * события — из его карты, суженной до опубликованных имён, слоты — из
 * объявления `slots`, кортеж — из `plugins`.
 */
export interface IComponentDescriptor<
	/*
	 * Все четыре параметра вытаскиваются через infer в DescriptorProps,
	 * DescriptorEvents, DescriptorPlugins и DescriptorSlots
	 * (`inference.types.ts`) — ради этого дескриптор и параметризован. В теле
	 * они не упоминаются, и сквозь infer линтер их не видит.
	 */
	/* eslint-disable @typescript-eslint/no-unused-vars */
	TProps extends object = Record<string, unknown>,
	TEvents extends object = object,
	TPlugins extends readonly IPluginDefinition[] = readonly [],
	TSlots extends object = object,
	/* eslint-enable @typescript-eslint/no-unused-vars */
	/** Тип инстанса, который строит `ctor`; уходит в `IAdapterContext<TInstance>`. */
	TInstance extends object = object,
	/**
	 * Опубликованные имена событий — `events` и триггеры пропсов, свои и
	 * `extends`. Их читает `defineComponent` наследника: его карту событий он
	 * сужает до них вместе со своими. Нужны отдельно от `TEvents`, потому что у
	 * дескриптора без класса ядра (`EntityDescriptor`, `CollectionDescriptor`)
	 * карты нет, а имена есть. Не задан — имена неизвестны, то есть любые.
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	TEventName extends string = string,
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
