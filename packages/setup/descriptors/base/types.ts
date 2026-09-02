/**
 * Типы для ComponentDescriptor — единого источника истины о компоненте.
 *
 * Дескриптор консолидирует: Contribution + Constructor + Plugins.
 * Вся логика форматирования имён (namespace:name) инкапсулирована в TComponentAccessor.
 */

import type { IContribution, ICompiledProp, ICompiledEvent, TComponentAccessor } from '@soldy/accessor'
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

/** Определение композиции — компонент, встроенный через свойство (не наследование). */
export interface ICompositionDefinition {
    /** Дескриптор компонента, чьи свойства/события выставляются наружу */
    descriptor: IComponentDescriptor
    /** Функция доступа к экземпляру: (instance) => instance._collection */
    get: (instance: any) => any
    /** Пространство имён для экспорта. Если не указан — свойства сливаются без префикса. */
    namespace?: string
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
    /** Композиция — компоненты, встроенные через свойства (не наследование) */
    composition?: ICompositionDefinition[]
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
    /** Определения композиций */
    composition: ICompositionDefinition[]

    /** Создать бандл плагинов */
    createBundle(): IPluginBundle

    /** Создать TComponentAccessor для переданных instance и bundle */
    createAccessor(instance: any, bundle: IPluginBundle): TComponentAccessor
}
