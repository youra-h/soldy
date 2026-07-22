/**
 * defineComponent / definePlugin — фабрики дескрипторов компонентов.
 *
 * Компилирует contributions в скомпилированные props/events с учётом namespace.
 * Namespace плагина извлекается из Symbol.key.description.
 */

import { TPluginBundle } from '@soldy/plugins'
import { ComponentAccessor, type IContribution, type ICompiledProp, type ICompiledEvent } from '@soldy/provider'
import type { IPluginDefinition, IComponentDefinitionOptions, IComponentDescriptor } from './types'

// --- compileContribution ---

/** Компилирует сырую контрибуцию в скомпилированные props и events.
 *  Если передан namespace, он добавляется к каждому триггеру. */
function compileContribution(
    contribution?: IContribution,
    namespace?: string,
): { props: ICompiledProp[]; events: ICompiledEvent[] } {
    if (!contribution) return { props: [], events: [] }

    const props: ICompiledProp[] = (contribution.props ?? []).map((p) => ({
        name: p.name,
        protected: !!p.protected,
        // Если есть namespace, проставляем его каждому триггеру
        // (например: 'change:visible' → 'element:change:visible')
        triggers: (p.triggers ?? []).map((t) => (namespace ? `${namespace}:${t}` : t)),
        namespace,
    }))

    const events: ICompiledEvent[] = (contribution.events ?? []).map((name) => ({
        name,
        namespace,
    }))

    return { props, events }
}

// --- definePlugin ---

export function definePlugin(options: {
    ctor: any
    contribution?: IContribution
}): IPluginDefinition {
    const key: symbol = options.ctor.key
    // Namespace извлекаем из описания символа плагина
    const namespace: string =
        key.description || String(key).replace(/^Symbol\((.*)\)$/, '$1')

    return {
        ctor: options.ctor,
        contribution: options.contribution,
        key,
        namespace,
    }
}

// --- defineComponent ---

export function defineComponent(options: IComponentDefinitionOptions): IComponentDescriptor {
    const parent = options.extends

    // Плагины: родительские + свои
    const plugins: IPluginDefinition[] = [
        ...(parent?.plugins ?? []),
        ...(options.plugins ?? []),
    ]

    // 1. Компонент (без namespace)
    const own = compileContribution(options.contribution)

    // 2. Плагины (с namespace)
    const pluginContributions = (options.plugins ?? []).map((plugin) =>
        compileContribution(plugin.contribution, plugin.namespace),
    )

    // Объединяем props: родитель → свои → плагинов
    const props: ICompiledProp[] = [
        ...(parent?.props ?? []),
        ...own.props,
        ...pluginContributions.flatMap((c) => c.props),
    ]

    // Объединяем events
    const events: ICompiledEvent[] = [
        ...(parent?.events ?? []),
        ...own.events,
        ...pluginContributions.flatMap((c) => c.events),
    ]

    return {
        ctor: options.ctor ?? parent?.ctor ?? Object,

        props,
        events,
        plugins,

        createBundle() {
            const bundle = new TPluginBundle()
            for (const plugin of plugins) {
                bundle.use(plugin.ctor)
            }
            return bundle
        },

        createAccessor(instance: any, bundle: TPluginBundle) {
            const pluginsMap = new Map<string, any>()

            for (const pluginDef of plugins) {
                const pluginInstance = bundle.get(pluginDef.ctor)
                if (pluginInstance) {
                    pluginsMap.set(pluginDef.namespace, pluginInstance)
                }
            }

            return new ComponentAccessor(props, events, instance, pluginsMap)
        },
    }
}
