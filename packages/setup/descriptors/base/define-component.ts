/**
 * defineComponent — создаёт дескриптор компонента.
 *
 * Компилирует contributions в props/events, объединяет с родительскими
 * дескрипторами (extends — один или массив), добавляет плагины с namespace.
 *
 * Поддерживает множественное наследование:
 * extends: [ControlDescriptor, ActivatableCollectionDescriptor]
 */

import { TPluginBundle } from '@soldy/plugins'
import { TComponentAccessor, type ICompiledProp, type ICompiledEvent } from '@soldy/accessor'
import type { IComponentDefinitionOptions, IComponentDescriptor, IPluginDefinition } from './types'
import { compileContribution } from './compile-contribution'

function toArray<T>(val: T | T[] | undefined): T[] {
	if (!val) return []
	return Array.isArray(val) ? val : [val]
}

export function defineComponent(options: IComponentDefinitionOptions): IComponentDescriptor {
	const parents: IComponentDescriptor[] = toArray(options.extends)

	// Плагины: от всех родителей + свои (дедупликация по ctor через Map)
	const pluginsMap = new Map<any, IPluginDefinition>()

	for (const p of parents) {
		for (const pl of p.plugins ?? []) {
			pluginsMap.set(pl.namespace, pl)
		}
	}
	for (const pl of options.plugins ?? []) {
		pluginsMap.set(pl.namespace, pl)
	}

	const plugins: IPluginDefinition[] = [...pluginsMap.values()]

	// 1. Свой вклад
	const own = compileContribution(options.contribution)

	// 2. Плагины (с namespace)
	const pluginContributions = (options.plugins ?? []).map((plugin) =>
		compileContribution(plugin.contribution, plugin.namespace),
	)

	// Объединяем props: все родители → свои → плагинов
	const props: ICompiledProp[] = [
		...parents.flatMap((p) => p.props ?? []),
		...own.props,
		...pluginContributions.flatMap((c) => c.props),
	]

	// Объединяем events
	const events: ICompiledEvent[] = [
		...parents.flatMap((p) => p.events ?? []),
		...own.events,
		...pluginContributions.flatMap((c) => c.events),
	]

	return {
		ctor: options.ctor ?? parents[0]?.ctor ?? Object,

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

			return new TComponentAccessor(props, events, instance, pluginsMap)
		},
	}
}
