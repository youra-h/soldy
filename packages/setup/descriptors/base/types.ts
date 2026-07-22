/**
 * Типы для ComponentDescriptor — единого источника истины о компоненте.
 *
 * Дескриптор консолидирует: Contribution + Constructor + Plugins.
 * Вся логика форматирования имён (namespace:name) инкапсулирована в ComponentAccessor.
 */

import type { IContribution, ICompiledProp, ICompiledEvent, ComponentAccessor } from '@soldy/provider'
import type { IPluginBundle, TPluginConstructor } from '@soldy/plugins'

/** Определение плагина в составе дескриптора. */
export interface IPluginDefinition {
    /** Конструктор плагина (со статическим key) */
    ctor: TPluginConstructor
    /** Контрибуция плагина (свойства/события, которые он выставляет наружу) */
    contribution?: IContribution
    /** Символьный ключ плагина */
    key: symbol
    /** Пространство имён, извлечённое из key.description */
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
    /** Скомпилированные свойства (с namespace от плагинов) */
    props: ICompiledProp[]
    /** Скомпилированные события (с namespace от плагинов) */
    events: ICompiledEvent[]
    /** Определения плагинов */
    plugins: IPluginDefinition[]

    /** Создать бандл плагинов */
    createBundle(): IPluginBundle

    /** Создать ComponentAccessor для переданных instance и bundle */
    createAccessor(instance: any, bundle: IPluginBundle): ComponentAccessor
}
