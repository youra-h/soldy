/**
 * Контракт дескриптора компонента и определения плагина.
 *
 * Дескриптор отдаёт декларации: props, events, slots и состав плагинов
 * библиотеки. Собирает по ним компонент сборка (`assemble/`).
 */

import type { IContribution, IPropDeclaration, ISlotDeclaration, TName } from '@soldy/accessor'
import type { IPluginConstructor } from '@soldy/plugins'

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

/** Опции без привязки к конкретному составу плагинов и инстансу — для реализации. */
export type TDefinitionOptions = IComponentDefinitionOptions<
	readonly IPluginDefinition[],
	readonly IPluginDefinition[],
	object,
	object
>

/** Контекст сборки набора: что знает о компоненте тот, кто его собирает. */
export interface IBundleContext {
	/** Имя места во вложенной разметке; нет — компонент поставил пользователь. */
	embedded?: string
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
