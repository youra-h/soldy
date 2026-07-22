/**
 * @soldy/provider — inspector.ts
 *
 * DescriptorInspector — статический анализатор схемы компонента.
 *
 * Не зависит от рантайма (instance, bundle). Занимается только
 * форматированием имён (namespace:name) и кэширует результаты.
 *
 * Используется:
 * - ComponentAccessor'ом (делегирование)
 * - UI-адаптерами напрямую (useEmits/useProps на уровне модуля)
 */

import type { ICompiledProp, ICompiledEvent, IComponentSchema } from './contract'

export class DescriptorInspector {
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
