/**
 * Типы для ComponentDescriptor.
 * Работают через TAccessor: Unit = { instance, props, events }.
 */

import type { IContribution, IPropDeclaration, TAccessor, TName } from '@soldy/accessor'
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
