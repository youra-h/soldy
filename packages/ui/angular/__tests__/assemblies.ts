/**
 * Assemblies of the components of one class, counted by a probe plugin.
 *
 * Whether a component is assembled, the plugins of its set see: the probe
 * counts its own `install` and `destroy`, that is the assemblies and teardowns
 * of the components of the class. `DebugElement` does not see a projection
 * that is not drawn, and a test on it would pass with the content assembled
 * right away; `queryObjects` of `node:v8` is not there in a spec built for the
 * browser.
 */

import { TBasePlugin, type IPluginContext } from '@soldy-ui/plugins'
import { usePlugins } from '@soldy-ui/setup'

/** How many components of the class were assembled and torn down. */
export type TAssemblies = { install: number; destroy: number }

/** A live count and the cancel of its registration. */
export type TAssemblyProbe = { readonly counts: TAssemblies; readonly dispose: () => void }

/**
 * Count the assemblies of the components of `type` from now on. The cancel
 * leaves the components assembled before it counted: their teardown counts
 * too. `options` are those of `usePlugins`: with `scope: 'all'` the details of
 * library markup count as well.
 */
export function countAssemblies(
	type: Parameters<typeof usePlugins>[0],
	options?: Parameters<typeof usePlugins>[2],
): TAssemblyProbe {
	const counts: TAssemblies = { install: 0, destroy: 0 }

	// A class per count: the registry puts one instance of a plugin class into a set
	class TAssemblyProbePlugin extends TBasePlugin {
		override install(ctx: IPluginContext, settings?: unknown): void {
			super.install(ctx, settings)

			counts.install++
		}

		override destroy(): void {
			super.destroy()

			counts.destroy++
		}
	}

	return { counts, dispose: usePlugins(type, [TAssemblyProbePlugin], options) }
}
