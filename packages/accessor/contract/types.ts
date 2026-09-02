/**
 * @soldy/accessor — contract/types.ts
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

/** Схема компонента: скомпилированные props + events (контракт для TDescriptorInspector) */
export interface IComponentSchema {
    props: ICompiledProp[]
    events: ICompiledEvent[]
}

/**
 * Стратегия форматирования имён props и событий под конкретный фреймворк.
 *
 * - prop(name, ns):  'styles' + 'icon-styles' → 'iconStyles_styles' (Vue/JS)
 * - event(name, ns): 'ready' + 'element'    → 'element:ready'      (Vue)
 */
export interface INamingStrategy {
    prop: (name: string, namespace?: string) => string
    event: (name: string, namespace?: string) => string
}

/**
 * Адаптер контекста родитель-ребёнок (Elevator).
 *
 * Абстрагирует provide/inject (Vue), React.Context, Angular DI
 * за единым интерфейсом. Вызовы up()/down() должны происходить
 * синхронно во время инициализации UI-компонента.
 *
 * @template T — тип передаваемого значения
 */
export interface IContextElevator<T = any> {
    /** Передать значение вниз по дереву (provide) */
    down(value: T): void
    /** Получить значение от ближайшего родителя (inject) */
    up(): T | undefined
}
