import { TSurface, type IComponentDescriptor } from '@soldy-ui/setup'
import { SolidProfile } from '@soldy-ui/solid'
import type { TPreviewEventSink } from '@soldy-ui/playground-shared'

/** Listeners of a component in Solid: callback props by name (`onChangeText`). */
export type TListeners = Record<string, (...args: unknown[]) => void>

/** Listeners of the preview's parts, by part name (`partsOf`). */
export type TParts = Readonly<Record<string, TListeners>>

/**
 * Listeners of all the events of a component or a part — in Solid.
 *
 * The list is the surface of its descriptors (`componentDescriptors`, a
 * part's — `TComponentEntry.parts`) in the Solid profile (`TSurface`): own
 * events and the props' triggers, of a collection — the facade's too. The
 * component sends its events as callback props by the same surface, so there
 * is a listener for exactly what the component declared. An event added
 * appears on the stand by itself.
 *
 * The callback's name is Solid's (`onChangeText`), and the sink gets the full
 * core name (`change:text`): the scenario journal and the page console are
 * one for all frameworks. `update:<prop>` is Vue's v-model, Solid has none.
 */
export function listenersOf(
	descriptors: readonly IComponentDescriptor[],
	sink: TPreviewEventSink,
): TListeners {
	const listeners: TListeners = {}

	for (const descriptor of descriptors) {
		for (const { name, exportName } of TSurface.of(descriptor, SolidProfile).events) {
			listeners[exportName] = (...args: unknown[]) => sink(name.getName(), args)
		}
	}

	return listeners
}
