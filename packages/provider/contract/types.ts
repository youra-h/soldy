/**
 * @soldy/provider — contract/types.ts
 *
 * Базовые типы контрактов: описание свойств и событий.
 * Чистые абстракции, без привязки к конкретным классам.
 */

/** Вход: декларация одного свойства в контрибуции */
export interface IPropContribution {
    name: string
    protected?: boolean
    triggers?: string[]
}

/** Вход: декларация контрибуции — набор свойств + событий */
export interface IContribution {
    props?: IPropContribution[]
    events?: string[]
}

/** Базовый скомпилированный элемент (prop или event) с опциональным namespace */
export interface ICompiledItem {
    name: string
    namespace?: string
}

/** Скомпилированное свойство: всегда с нормализованным protected и triggers */
export interface ICompiledProp extends ICompiledItem {
    protected: boolean
    triggers: string[]
}

/** Скомпилированное событие */
export interface ICompiledEvent extends ICompiledItem {}

/** Схема компонента: скомпилированные props + events (контракт для DescriptorInspector) */
export interface IComponentSchema {
    props: ICompiledProp[]
    events: ICompiledEvent[]
}
