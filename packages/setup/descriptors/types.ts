/**
 * Типы для ComponentDescriptor — единого источника истины о компоненте.
 *
 * Дескриптор консолидирует: Contribution + Provider + Constructor + Plugins.
 * Заменяет ручную сборку compileComponent([...]) и ручную регистрацию провайдеров.
 */

import type { IContribution, IComponentModel } from '@soldy/provider'
import type { IAccessorProvider, IEventProvider } from '@soldy/provider'

/** Определение плагина в составе дескриптора.
 * contribution и provider опциональны — если плагин не выставляет пропы наружу (например, TInstancePlugin),
 * он просто добавляется в bundle без попадания в модель. */
export interface IPluginDefinition {
	plugin: new (...args: any[]) => any
	contribution?: IContribution
	provider?: new (instance: any) => IAccessorProvider & IEventProvider
}

/** Опции для defineComponent(). */
export interface IComponentDescriptorOptions {
	ctor: Function
	extends?: IComponentDescriptor
	contribution: IContribution
	plugins?: IPluginDefinition[]
	provider: new (instance: any) => IAccessorProvider & IEventProvider
}

/**
 * Дескриптор компонента — единственный источник истины.
 * Содержит всё необходимое для создания модели, бандла, провайдера и рантайма.
 */
export interface IComponentDescriptor {
	readonly ctor: Function
	readonly extends?: IComponentDescriptor
	readonly contribution: IContribution
	readonly plugins: IPluginDefinition[]
	readonly provider: new (instance: any) => IAccessorProvider & IEventProvider

	/** Автоматически скомпилированная модель (props + events) */
	readonly model: IComponentModel

	/** Создать TPluginBundle с рекурсивным сбором плагинов по цепочке extends */
	createBundle(): any

	/** Создать TAggregateProvider с провайдерами для компонента и всех плагинов */
	createProvider(ctx: { instance: any; bundle: any }): IAccessorProvider & IEventProvider

	/** Создать TRuntime одной строкой */
	createRuntime(ctx: { instance: any; bundle: any }): any
}
