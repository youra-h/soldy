/**
 * defineComponent / definePlugin — фабрики дескрипторов компонентов.
 *
 * Перенесено из @soldy/provider: использует TPluginBundle из @soldy/plugins.
 * В @soldy/provider остаются только интерфейсы (IComponentDescriptor и др.).
 */

import type { IComponentModel, IContractProp, IContribution } from '@soldy/provider'
import type { IPluginDefinition, IComponentDescriptor, IComponentDescriptorOptions } from './types'
import { TAggregateProvider, TRuntime } from '@soldy/provider'
import { TPluginBundle } from '@soldy/plugins'

// --- definePlugin ---

export function definePlugin(options: {
	ctor: new (...args: any[]) => any
	contribution?: IContribution
	provider?: new (instance: any) => any
}): IPluginDefinition {
	return options as IPluginDefinition
}

// --- compileDescriptor (рекурсивная) ---

export function compileDescriptor(descriptor: IComponentDescriptor): IComponentModel {
	const props: IContractProp[] = []
	const events: string[] = []
	const seen = new Set<IComponentDescriptor>()

	function collect(d: IComponentDescriptor): void {
		if (seen.has(d)) return
		seen.add(d)

		if (d.extends) collect(d.extends)

		for (const p of d.contribution.props) {
			props.push({
				...p,
				mutable: p.mutable ?? true,
				public: p.public ?? p.kind !== 'computed',
			})
		}

		events.push(...d.contribution.events)

		for (const pluginDef of d.plugins) {
			if (!pluginDef.contribution) continue

			for (const p of pluginDef.contribution.props) {
				props.push({
					...p,
					mutable: p.mutable ?? true,
					public: p.public ?? p.kind !== 'computed',
				})
			}
			events.push(...pluginDef.contribution.events)
		}
	}

	collect(descriptor)

	return {
		props,
		publicProps: props.filter((p) => p.public),
		events: [...new Set(events)],
	}
}

// --- collectPlugins (рекурсивная) ---

function collectPlugins(
	descriptor: IComponentDescriptor,
	bundle: TPluginBundle,
	seen = new Set<Function>(),
): void {
	if (descriptor.extends) {
		collectPlugins(descriptor.extends, bundle, seen)
	}

	for (const pluginDef of descriptor.plugins) {
		if (!seen.has(pluginDef.ctor)) {
			seen.add(pluginDef.ctor)
			bundle.use(pluginDef.ctor as any)
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
			provider.add(new this.provider(ctx.instance))
			for (const pluginDef of this.plugins) {
				if (!pluginDef.provider) continue

				const pluginInstance = ctx.bundle.get(pluginDef.ctor as any)
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
