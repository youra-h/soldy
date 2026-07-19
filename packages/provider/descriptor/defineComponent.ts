/**
 * defineComponent / definePlugin — фабрики дескрипторов компонентов.
 *
 * Дескриптор — единый источник истины: консолидирует Contribution, Provider, Constructor, Plugins.
 * Заменяет ручную сборку compileComponent([...]), ручную регистрацию провайдеров и бандлов.
 */

import type { IComponentModel, IContractProp, IContribution } from '../contract'
import type { IPluginDefinition, IComponentDescriptor, IComponentDescriptorOptions } from './types'
import { TAggregateProvider, TRuntime } from '../runtime'
import { TPluginBundle } from '@soldy/plugins'

// --- definePlugin ---

export function definePlugin(options: {
	plugin: new (...args: any[]) => any
	contribution: IContribution
	provider: new (instance: any) => any
}): IPluginDefinition {
	return options as IPluginDefinition
}

// --- compileDescriptor (внутренняя, рекурсивная) ---

export function compileDescriptor(descriptor: IComponentDescriptor): IComponentModel {
	const props: IContractProp[] = []
	const events: string[] = []
	const seen = new Set<IComponentDescriptor>()

	function collect(d: IComponentDescriptor): void {
		if (seen.has(d)) return
		seen.add(d)

		// 1. Родитель (extends) — сначала
		if (d.extends) collect(d.extends)

		// 2. Собственная contribution
		for (const p of d.contribution.props) {
			props.push({
				...p,
				mutable: p.kind === 'computed' ? false : (p.mutable ?? true),
			})
		}
		events.push(...d.contribution.events)

		// 3. Contributions от плагинов
		for (const pluginDef of d.plugins) {
			for (const p of pluginDef.contribution.props) {
				props.push({
					...p,
					mutable: p.kind === 'computed' ? false : (p.mutable ?? true),
				})
			}
			events.push(...pluginDef.contribution.events)
		}
	}

	collect(descriptor)

	return { props, events: [...new Set(events)] }
}

// --- collectPlugins (внутренняя, рекурсивная) ---

function collectPlugins(
	descriptor: IComponentDescriptor,
	bundle: TPluginBundle,
	seen = new Set<Function>(),
): void {
	// 1. Родитель — сначала
	if (descriptor.extends) {
		collectPlugins(descriptor.extends, bundle, seen)
	}

	// 2. Собственные плагины
	for (const pluginDef of descriptor.plugins) {
		if (!seen.has(pluginDef.plugin)) {
			seen.add(pluginDef.plugin)
			bundle.use(pluginDef.plugin as any)
		}
	}
}

// --- defineComponent ---

export function defineComponent(options: IComponentDescriptorOptions): IComponentDescriptor {
	const descriptor: IComponentDescriptor = {
		ctor: options.ctor,
		extends: options.extends,
		contribution: options.contribution,
		plugins: options.plugins ?? [],
		provider: options.provider,

		get model(): IComponentModel {
			// Вычисляется лениво при первом обращении
			const value = compileDescriptor(descriptor)
			Object.defineProperty(descriptor, 'model', {
				value,
				writable: false,
				configurable: false,
			})
			return value
		},

		createBundle() {
			const bundle = new TPluginBundle()
			collectPlugins(descriptor, bundle)
			return bundle
		},

		createProvider(ctx: { instance: any; bundle: any }) {
			const provider = new TAggregateProvider()

			// Провайдер самого компонента
			provider.add(new this.provider(ctx.instance))

			// Провайдеры плагинов
			for (const pluginDef of this.plugins) {
				const pluginInstance = ctx.bundle.get(pluginDef.plugin as any)
				if (pluginInstance) {
					provider.add(new pluginDef.provider(pluginInstance))
				}
			}

			return provider
		},

		createRuntime(ctx: { instance: any; bundle: any }) {
			return new TRuntime(this.model, this.createProvider(ctx))
		},
	}

	return descriptor
}
