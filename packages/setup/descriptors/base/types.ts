/**
 * Типы для ComponentDescriptor — единого источника истины о компоненте.
 *
 * Дескриптор консолидирует: Contribution + Constructor + Plugins.
 * Вся логика форматирования имён (namespace:name) инкапсулирована в TComponentAccessor.
 */

import type {
	IContribution,
	ICompiledProp,
	ICompiledEvent,
	TComponentAccessor,
	ICollectionExtensionDescriptor,
	ICollectionSchema,
	TCollectionAccessor,
	TItemContextAccessor,
	INamingStrategy,
} from '@soldy/accessor'
import type { IPluginBundle, IPluginConstructor } from '@soldy/plugins'

/** Определение плагина в составе дескриптора. */
export interface IPluginDefinition {
	ctor: IPluginConstructor<any, any, any>
	contribution?: IContribution
	/** Опции, передаваемые в plugin.install(ctx, options) */
	options?: Record<string, any>
	namespace: string
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
 * Содержит всё необходимое для создания бандла и accessor'а.
 */
export interface IComponentDescriptor {
	/** Конструктор core-компонента */
	ctor: any
	/** Скомпилированные свойства (с namespace от плагинов и композиций) */
	props: ICompiledProp[]
	/** Скомпилированные события (с namespace от плагинов и композиций) */
	events: ICompiledEvent[]
	/** Определения плагинов */
	plugins: IPluginDefinition[]

	/** Создать бандл плагинов */
	createBundle(instance: any): IPluginBundle

	/** Создать TComponentAccessor для переданных instance и bundle */
	createAccessor(instance: any, bundle: IPluginBundle): TComponentAccessor
}

/**
 * Дескриптор коллекции — единый источник истины о структуре коллекции.
 * Создаётся через defineCollection({ extensions: [...] }).
 */
export interface ICollectionDescriptor {
	readonly schema: ICollectionSchema
	/** Создать экземпляр TCollection со всеми расширениями */
	create(instance: any): any
	/** Создать TCollectionAccessor для реактивного состояния родительского компонента */
	createAccessor(collection: any, naming?: INamingStrategy): TCollectionAccessor
	/** Создать TItemContextAccessor для реактивного состояния дочернего компонента */
	createItemAccessor(context: any, naming?: INamingStrategy): TItemContextAccessor
}

export type { ICollectionExtensionDescriptor }
