import { createContext } from 'svelte'
import { TSurface, type IComponentDescriptor } from '@soldy-ui/setup'
import { SvelteProfile } from '@soldy-ui/svelte'
import type { TPreviewEventSink } from '@soldy-ui/playground-shared'

/** Listeners of a component in Svelte: callback props by name (`onChangeText`). */
export type TListeners = Record<string, (...args: unknown[]) => void>

/** Listeners of the preview's parts, by part name (`partsOf`). */
export type TParts = Readonly<Record<string, TListeners>>

/**
 * Listeners of all the events of a component or a part — in Svelte.
 *
 * The list is the surface of its descriptors (`componentDescriptors`, a
 * part's — `TComponentEntry.parts`) in the Svelte profile (`TSurface`): own
 * events and the props' triggers, of a collection — the facade's too. The
 * component sends its events as callback props by the same surface, so there
 * is a listener for exactly what the component declared. An event added
 * appears on the stand by itself.
 *
 * The callback's name is Svelte's (`onChangeText`), and the sink gets the full
 * core name (`change:text`): the scenario journal and the page console are
 * one for all frameworks. `update:<prop>` is Vue's v-model, Svelte has none.
 */
export function listenersOf(
	descriptors: readonly IComponentDescriptor[],
	sink: TPreviewEventSink,
): TListeners {
	const listeners: TListeners = {}

	for (const descriptor of descriptors) {
		for (const { name, exportName } of TSurface.of(descriptor, SvelteProfile).events) {
			listeners[exportName] = (...args: unknown[]) => sink(name.getName(), args)
		}
	}

	return listeners
}

/**
 * The listeners of the preview's parts — from the host's root to the previews
 * that place parts in markup. A context, not a prop: a prop the preview does
 * not take would go on with the rest (`{...bind}`) to its component's root.
 */
export const [getParts, setParts] = createContext<TParts>()
