/**
 * defineComponent — создаёт дескриптор компонента.
 *
 * Компилирует contributions в props/events, объединяет с родительским
 * дескриптором (extends), добавляет плагины с namespace.
 */

import { TPluginBundle } from '@soldy/plugins'
import { TComponentAccessor, type ICompiledProp, type ICompiledEvent } from '@soldy/accessor'
import type {
	IComponentDefinitionOptions,
	IComponentDescriptor,
	IPluginDefinition,
	ICompositionDefinition,
} from './types'
import { compileContribution } from './compile-contribution'

/**
 * Сборщик плагинов с дедупликацией по key.
 * Каждый следующий add перезаписывает плагин с тем же ключом —
 * приоритет определяется порядком вызовов.
 */
function createPluginCollector() {
	const map = new Map<string, IPluginDefinition>()

	return {
		add(plugins: IPluginDefinition[]): void {
			for (const p of plugins) map.set(p.namespace, p)
		},
		toArray(): IPluginDefinition[] {
			return [...map.values()]
		},
	}
}

export function defineComponent(options: IComponentDefinitionOptions): IComponentDescriptor {
	const parent = options.extends

	// Композиции: родительские + свои (объявляем до plugins, чтобы включить их плагины)
	const composition: ICompositionDefinition[] = [
		...(parent?.composition ?? []),
		...(options.composition ?? []),
	]

	// Плагины: родительские → композиций → свои (с дедупликацией).
	// Порядок важен: плагины композиций (TElementAccumulationPlugin)
	// должны быть установлены ДО своих плагинов (TTabsActiveTabPlugin),
	// потому что свои плагины в install() ищут плагины композиций через bundle.get().
	const collector = createPluginCollector()

	// Добавляем плагины родителя (если есть) и плагины композиций
	collector.add(parent?.plugins ?? [])
	// Композиции уже скомпилированы, берем их плагины
	for (const comp of composition) {
		collector.add(comp.descriptor.plugins)
	}
	// Добавляем свои плагины (если есть)
	collector.add(options.plugins ?? [])

	const plugins = collector.toArray()

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
			triggers: comp.namespace ? p.triggers.map((t) => `${comp.namespace}:${t}`) : p.triggers,
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

		createBundle(instance: any) {
			const bundle = new TPluginBundle(instance)

			for (const plugin of plugins) {
				bundle.use(plugin.ctor, plugin.options ?? {})
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
