/**
 * Типы для ComponentDescriptor и CollectionDescriptor.
 * Работают через TAccessor: Unit = { instance, props, events }.
 */

import type {
	IContribution,
	IPropDeclaration,
	TAccessor,
	TName,
} from '@soldy/accessor'
import type { IPluginBundle, IPluginConstructor } from '@soldy/plugins'

/** Определение плагина в составе дескриптора. */
export interface IPluginDefinition {
	ctor: IPluginConstructor<any, any, any>
	/** Нормализованные props из contribution */
	props: IPropDeclaration[]
	/** Нормализованные events из contribution */
	events: TName[]
	/** Опции, передаваемые в plugin.install(ctx, options) */
	options?: Record<string, any>
}

/** Опции для defineComponent(). */
export interface IComponentDefinitionOptions {
	/** Конструктор core-компонента */
	ctor?: any
	/** Родительский дескриптор (наследование props, events, plugins) */
	extends?: IComponentDescriptor
	/** Собственная контрибуция компонента */
	contribution?: IContribution
	/** Плагины (каждый — результат definePlugin) */
	plugins?: IPluginDefinition[]
}

/**
 * Дескриптор компонента — единственный источник истины.
 * props/events — статические объявления для useProps/useEmits.
 * createAccessor создаёт TAccessor с Unit'ами { instance, props, events }.
 */
export interface IComponentDescriptor {
	ctor: any
	/** Статические объявления для useProps/useEmits (без instances) */
	props: IPropDeclaration[]
	events: TName[]
	plugins: IPluginDefinition[]

	createBundle(instance: any): IPluginBundle
	/** Создаёт TAccessor: Unit'ы из instance и plugin instances */
	createAccessor(instance: any, bundle: IPluginBundle): TAccessor
}

/**
 * Дескриптор расширения коллекции (результат defineExtension).
 */
export interface ICollectionExtensionDescriptor<TItem = any> {
	name: string
	/** Префикс экспорта props/events; если не задан — имена используются как есть. */
	namespace?: string
	ctor: new (options?: any) => any
	/** Props/events для родительского компонента (collection-level) */
	contribution?: IContribution
	/** Props/events для дочернего компонента (item-level) */
	itemContribution?: IContribution
	optionsFactory?: (instance: any) => any
}

/**
 * Дескриптор коллекции (результат defineCollection).
 * createAccessor/createItemAccessor возвращают TAccessor.
 */
export interface ICollectionDescriptor {
	/** Статические объявления props/events для каждого уровня */
	parentProps: IPropDeclaration[]
	parentEvents: TName[]
	itemProps: IPropDeclaration[]
	itemEvents: TName[]

	create(instance: any): any
	/** TAccessor для родительского компонента (items, activeItem...) */
	createAccessor(collection: any): TAccessor
	/** TAccessor для дочернего компонента (active, order, closable...) */
	createItemAccessor(context: any): TAccessor
}
