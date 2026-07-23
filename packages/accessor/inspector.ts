/**
 * @soldy/accessor — inspector.ts
 *
 * TDescriptorInspector — статический анализатор схемы компонента.
 *
 * Не зависит от рантайма (instance, bundle). Занимается только
 * форматированием имён и кэширует результаты.
 *
 * Принимает опциональный INamingStrategy. Без стратегии использует
 * формат namespace:name (обратная совместимость). Со стратегией —
 * форматирует имена под конкретный фреймворк (например, camelCase для Vue).
 *
 * Используется:
 * - TComponentAccessor'ом (делегирование)
 * - UI-адаптерами напрямую (createVueAdapter)
 */

import type { ICompiledProp, ICompiledEvent, IComponentSchema, INamingStrategy, ICompiledItem } from './contract'

export class TDescriptorInspector {
    private props: ICompiledProp[]
    private events: ICompiledEvent[]
    private naming?: INamingStrategy

    // Кэш
    private cachedExportProps?: Record<string, any>
    private cachedExportEvents?: string[]

    constructor(schema: IComponentSchema, naming?: INamingStrategy) {
        this.props = schema.props
        this.events = schema.events
        this.naming = naming
    }

    /** Имя с префиксом namespace (без стратегии): 'tag' или 'element:ready' */
    getExportName(item: { name: string; namespace?: string }): string {
        return item.namespace ? `${item.namespace}:${item.name}` : item.name
    }

    /** Форматирует имя prop'а через стратегию (если есть), иначе ns:name */
    getExportPropName(prop: ICompiledProp): string {
        return this.naming
            ? this.naming.prop(prop.name, prop.namespace)
            : this.getExportName(prop)
    }

    /** Форматирует имя события через стратегию (если есть), иначе ns:name */
    getExportEventName(item: ICompiledItem): string {
        return this.naming
            ? this.naming.event(item.name, item.namespace)
            : this.getExportName(item)
    }

    /**
     * Триггеры для emit.
     * Триггеры в ICompiledProp УЖЕ содержат namespace (compileContribution),
     * возвращаем как есть.
     */
    getExportTriggers(prop: ICompiledProp): string[] {
        return prop.triggers
    }

    /**
     * Сырые имена триггеров (без namespace) — для подписки на eventSource.
     * 'icon-styles:change:styles' → 'change:styles'
     */
    getRawTriggers(prop: ICompiledProp): string[] {
        if (!prop.namespace) return prop.triggers

        const prefix = `${prop.namespace}:`
        return prop.triggers.map((t) =>
            t.startsWith(prefix) ? t.slice(prefix.length) : t,
        )
    }

    /** Готовый список всех экспортируемых событий (для useEmits) */
    getExportEvents(): string[] {
        if (this.cachedExportEvents) return this.cachedExportEvents

        const events: string[] = []

        for (const evt of this.events) {
            events.push(this.getExportEventName(evt))
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

            const exportName = this.getExportPropName(prop)
            props[exportName] = {
                default: defaultValues[prop.name],
            }
        }

        this.cachedExportProps = props
        return this.cachedExportProps
    }
}
