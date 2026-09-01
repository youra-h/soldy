/**
 * defineComponent — создаёт дескриптор компонента.
 *
 * createAccessor строит TAccessor из Unit'ов:
 *   - Unit[0]: сам instance + собственные props/events
 *   - Unit[N]: plugin instance + его props/events
 * Никакого namespace или pluginsMap.
 */

import { TPluginBundle } from '@soldy/plugins'
import { TAccessor, type IPropDeclaration } from '@soldy/accessor'
import type { IComponentDefinitionOptions, IComponentDescriptor, IPluginDefinition } from './types'
import { normalizeContribution } from './compile-contribution'

function createPluginCollector() {
	const map = new Map<any, IPluginDefinition>()

	return {
		add(plugins: IPluginDefinition[]): void {
			for (const p of plugins) map.set(p.ctor, p)
		},
		toArray(): IPluginDefinition[] {
			return [...map.values()]
		},
	}
}

export function defineComponent(options: IComponentDefinitionOptions): IComponentDescriptor {
	const parent = options.extends

	const collector = createPluginCollector()

	collector.add(parent?.plugins ?? [])
	collector.add(options.plugins ?? [])

	const plugins = collector.toArray()

	const own = normalizeContribution(options.contribution)

	// Статические props/events: свои + наследуемые (без плагинов — они в plugins[])
	const props: IPropDeclaration[] = [...(parent?.props ?? []), ...own.props]

	const events = [...(parent?.events ?? []), ...own.events]

	return {
		ctor: options.ctor ?? parent?.ctor ?? Object,

		props,
		events,
		plugins,

		createBundle(instance: any) {
			const bundle = new TPluginBundle(instance)
			for (const plugin of plugins) {
				bundle.use(plugin.ctor, plugin.options ?? {})
			}
			return bundle
		},

		createAccessor(instance: any, bundle: TPluginBundle) {
			return new TAccessor([
				// Unit компонента: все наследуемые + собственные props/events
				{ instance, props, events },
				// Units плагинов
				...plugins
					.map((def) => ({
						instance: bundle.get(def.ctor),
						props: def.props,
						events: def.events,
					}))
					.filter((u) => u.instance != null),
			])
		},
	}
}
