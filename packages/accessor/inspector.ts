/**
 * @soldy/accessor — inspector.ts
 *
 * TDescriptorInspector — статический анализатор схемы компонента.
 *
 * Не зависит от рантайма (instance, bundle). Занимается только
 * форматированием имён (namespace:name) и кэширует результаты.
 *
 * Используется:
 * - TComponentAccessor'ом (делегирование)
 * - UI-адаптерами напрямую (useEmits/useProps на уровне модуля)
 */

import type { ICompiledProp, ICompiledEvent, IComponentSchema, INamingStrategy, ICompiledItem } from './contract'

export class TDescriptorInspector {
    private props: ICompiledProp[]
    private events: ICompiledEvent[]

    // Кэш
    private cachedExportProps?: Record<string, any>
    private cachedExportEvents?: string[]

    constructor(schema: IComponentSchema) {
        this.props = schema.props
        this.events = schema.events
    }

    /** Имя с префиксом namespace: 'tag' или 'element:ready' */
    getExportName(item: { name: string; namespace?: string }): string {
        return item.namespace ? `${item.namespace}:${item.name}` : item.name
    }

    /** Триггеры с префиксами namespace: ['element:change:visible'] */
    getExportTriggers(prop: ICompiledProp): string[] {
        return prop.triggers.map((t) =>
            prop.namespace ? `${prop.namespace}:${t}` : t,
        )
    }

    /** Готовый список всех экспортируемых событий (для useEmits) */
    getExportEvents(): string[] {
        if (this.cachedExportEvents) return this.cachedExportEvents

        const events: string[] = []

        for (const evt of this.events) {
            events.push(this.getExportName(evt))
        }

        for (const prop of this.props) {
            events.push(...this.getExportTriggers(prop))
        }

        this.cachedExportEvents = Array.from(new Set(events))
        return this.cachedExportEvents
    }

    /** Готовый словарь props (для useProps). Без ctrl/plugins — их добавляет UI-слой. */
    getExportProps(defaultValues: Record<string, any> = {}): Record<string, any> {
        if (this.cachedExportProps) return this.cachedExportProps

        const props: Record<string, any> = {}

        for (const prop of this.props) {
            if (prop.protected) continue

            const exportName = this.getExportName(prop)
            props[exportName] = {
                default: defaultValues[prop.name],
            }
        }

        this.cachedExportProps = props
        return this.cachedExportProps
    }
}

/**
 * DescriptorInspector — расширенный анализатор с поддержкой INamingStrategy.
 *
 * В отличие от TDescriptorInspector (жёсткий формат namespace:name),
 * этот класс делегирует форматирование имён внешней стратегии,
 * что позволяет адаптировать ключи под конкретный фреймворк.
 *
 * Используется UI-адаптерами (createVueAdapter).
 */
export class DescriptorInspector {
    private props: ICompiledProp[]
    private events: ICompiledEvent[]
    private naming: INamingStrategy

    private cachedExportProps?: Record<string, any>
    private cachedExportEvents?: string[]

    constructor(schema: IComponentSchema, naming: INamingStrategy) {
        this.props = schema.props
        this.events = schema.events
        this.naming = naming
    }

    /** Форматирует имя prop'а через стратегию */
    getExportPropName(prop: ICompiledProp): string {
        return this.naming.prop(prop.name, prop.namespace)
    }

    /** Форматирует имя события через стратегию */
    getExportEventName(item: ICompiledItem): string {
        return this.naming.event(item.name, item.namespace)
    }

    /** Готовый словарь props (для useProps). Без ctrl/plugins — их добавляет UI-слой. */
    getExportProps(defaultValues: Record<string, any> = {}): Record<string, any> {
        if (this.cachedExportProps) return this.cachedExportProps

        const props: Record<string, any> = {}

        for (const prop of this.props) {
            if (prop.protected) continue

            const exportName = this.getExportPropName(prop)
            props[exportName] = {
                default: defaultValues[prop.name],
            }
        }

        this.cachedExportProps = props
        return props
    }

    /** Готовый список всех экспортируемых событий (для useEmits) */
    getExportEvents(): string[] {
        if (this.cachedExportEvents) return this.cachedExportEvents

        const events: string[] = []

        for (const evt of this.events) {
            events.push(this.getExportEventName(evt))
        }

        for (const prop of this.props) {
            for (const trigger of prop.triggers) {
                events.push(
                    this.getExportEventName({ name: trigger, namespace: prop.namespace }),
                )
            }
        }

        this.cachedExportEvents = Array.from(new Set(events))
        return this.cachedExportEvents
    }
}
