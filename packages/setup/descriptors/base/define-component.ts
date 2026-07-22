/**
 * defineComponent — создаёт дескриптор компонента.
 *
 * Компилирует contributions в props/events, объединяет с родительским
 * дескриптором (extends), добавляет плагины с namespace.
 */

import { TPluginBundle } from '@soldy/plugins'
import { ComponentAccessor, type ICompiledProp, type ICompiledEvent } from '@soldy/accessor'
import type { IComponentDefinitionOptions, IComponentDescriptor, IPluginDefinition } from './types'
import { compileContribution } from './compile-contribution'

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
