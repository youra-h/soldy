import { TSurface, type IComponentDescriptor } from '@soldy-ui/setup'
import { ReactProfile } from '@soldy-ui/react'
import type { TPreviewEventSink } from '@soldy-ui/playground-shared'

/** Listeners of a component in React: callback props by name (`onChangeText`). */
export type TListeners = Record<string, (...args: unknown[]) => void>

/** Listeners of the preview's parts, by part name (`partsOf`). */
export type TParts = Readonly<Record<string, TListeners>>

/**
 * Listeners of all the events of a component or a part — in React.
 *
 * The list is the surface of its descriptors (`componentDescriptors`, a
 * part's — `TComponentEntry.parts`) in the React profile (`TSurface`): own
 * events and the props' triggers, of a collection — the facade's too. The
 * component sends its events as callback props by the same surface, so there
 * is a listener for exactly what the component declared. An event added
 * appears on the stand by itself.
 *
 * The callback's name is React's (`onChangeText`), and the sink gets the full
 * core name (`change:text`): the scenario journal and the page console are
 * one for all frameworks. `update:<prop>` is Vue's v-model, React has none.
 */
export function listenersOf(
	descriptors: readonly IComponentDescriptor[],
	sink: TPreviewEventSink,
): TListeners {
	const listeners: TListeners = {}

	for (const descriptor of descriptors) {
		for (const { name, exportName } of TSurface.of(descriptor, ReactProfile).events) {
			listeners[exportName] = (...args: unknown[]) => sink(name.getName(), args)
		}
	}

	return listeners
}
