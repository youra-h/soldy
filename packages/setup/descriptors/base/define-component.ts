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
		add(plugins: readonly IPluginDefinition[]): void {
			for (const p of plugins) map.set(p.ctor, p)
		},
		toArray(): IPluginDefinition[] {
			return [...map.values()]
		},
	}
}

function buildDescriptor(options: IComponentDefinitionOptions): IComponentDescriptor {
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
			if (plugins.length === 0) {
				return null
			}

			const bundle = new TPluginBundle(instance)

			for (const plugin of plugins) {
				bundle.use(plugin.ctor, plugin.options ?? {})
			}

			return bundle
		},

		createAccessor(instance: any, bundle: TPluginBundle | null) {
			return new TAccessor([
				// Unit компонента: все наследуемые + собственные props/events
				{ instance, props, events },
				// Units плагинов
				...plugins
					.map((def) => ({
						instance: bundle?.get(def.ctor),
						props: def.props,
						events: def.events,
					}))
					.filter((u) => u.instance != null),
			])
		},
	}
}

/**
 * Одноразовая форма (без явных type-аргументов): кортеж плагинов выводится из
 * options.plugins. Используется дескрипторами без явного типа props/events.
 */
export function defineComponent<
	const TPlugins extends readonly IPluginDefinition[] = readonly [],
	TParentPlugins extends readonly IPluginDefinition[] = readonly [],
>(
	options: IComponentDefinitionOptions<TPlugins, TParentPlugins>,
): IComponentDescriptor<Record<string, unknown>, {}, readonly [...TParentPlugins, ...TPlugins]>

/**
 * Curried-форма: явные TProps/TEvents на первом вызове, кортеж плагинов
 * выводится на втором. Используется типизированными дескрипторами.
 */
export function defineComponent<TProps extends object, TEvents extends object>(): <
	const TPlugins extends readonly IPluginDefinition[] = readonly [],
	TParentPlugins extends readonly IPluginDefinition[] = readonly [],
>(
	options: IComponentDefinitionOptions<TPlugins, TParentPlugins>,
) => IComponentDescriptor<TProps, TEvents, readonly [...TParentPlugins, ...TPlugins]>

export function defineComponent(...args: any[]): any {
	if (args.length > 0) return buildDescriptor(args[0])

	return (options: IComponentDefinitionOptions) => buildDescriptor(options)
}
