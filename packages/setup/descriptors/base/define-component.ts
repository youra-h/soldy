/**
 * defineComponent — создаёт дескриптор компонента.
 *
 * Компилирует contributions в props/events, объединяет с родительским
 * дескриптором (extends), добавляет плагины с namespace.
 */

import { TPluginBundle } from '@soldy/plugins'
import { TComponentAccessor, type ICompiledProp, type ICompiledEvent } from '@soldy/accessor'
import type { IComponentDefinitionOptions, IComponentDescriptor, IPluginDefinition, ICompositionDefinition } from './types'
import { compileContribution } from './compile-contribution'

export function defineComponent(options: IComponentDefinitionOptions): IComponentDescriptor {
    const parent = options.extends

    // Плагины: родительские + свои
    const plugins: IPluginDefinition[] = [
        ...(parent?.plugins ?? []),
        ...(options.plugins ?? []),
    ]

    // Композиции: родительские + свои
    const composition: ICompositionDefinition[] = [
        ...(parent?.composition ?? []),
        ...(options.composition ?? []),
    ]

    // 1. Компонент (без namespace)
    const own = compileContribution(options.contribution)

    // 2. Плагины (с namespace)
    const pluginContributions = (options.plugins ?? []).map((plugin) =>
        compileContribution(plugin.contribution, plugin.namespace),
    )

    // 3. Композиции — дескриптор уже скомпилирован, добавляем namespace если указан
    const compositionContributions = (options.composition ?? []).map((comp) => ({
        props: comp.descriptor.props.map((p) => ({
            ...p,
            // Безымянная композиция → '' (чтобы отличать от undefined у собственных props)
            namespace: comp.namespace ?? '',
            triggers: comp.namespace
                ? p.triggers.map((t) => `${comp.namespace}:${t}`)
                : p.triggers,
        })),
        events: comp.descriptor.events.map((e) => ({
            ...e,
            namespace: comp.namespace ?? '',
        })),
    }))

    // Объединяем props: родитель → свои → плагинов → композиций
    const props: ICompiledProp[] = [
        ...(parent?.props ?? []),
        ...own.props,
        ...pluginContributions.flatMap((c) => c.props),
        ...compositionContributions.flatMap((c) => c.props),
    ]

    // Объединяем events
    const events: ICompiledEvent[] = [
        ...(parent?.events ?? []),
        ...own.events,
        ...pluginContributions.flatMap((c) => c.events),
        ...compositionContributions.flatMap((c) => c.events),
    ]

    return {
        ctor: options.ctor ?? parent?.ctor ?? Object,

        props,
        events,
        plugins,
        composition,

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

            const compositionsMap = new Map<string, (instance: any) => any>()
            for (const compDef of composition) {
                compositionsMap.set(compDef.namespace ?? '', compDef.get)
            }

            return new TComponentAccessor(props, events, instance, pluginsMap, compositionsMap)
        },
    }
}
