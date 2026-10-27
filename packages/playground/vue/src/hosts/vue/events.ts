import type { IComponentDescriptor } from '@soldy-ui/setup'
import type { TPreviewEventSink } from '@soldy-ui/playground-shared'
import { useEmits } from '@soldy-ui/vue'

/** Listeners of a component in Vue: props `onChange:visible` by name. */
export type TListeners = Record<string, (...args: unknown[]) => void>

/** Listeners of the preview's parts, by part name (`partsOf`). */
export type TParts = Readonly<Record<string, TListeners>>

/**
 * Listeners of all the events of a component or a part — in Vue.
 *
 * The list is exactly what the component declares to Vue in `emits`:
 * `useEmits` of its descriptors (`componentDescriptors`, a part's —
 * `TComponentEntry.parts`), as `base.component.ts` of the collection
 * components joins them. It holds the explicit events, the props' triggers and
 * `update:<prop>` of v-model. An event added appears on the stand by itself.
 *
 * An event's name in Vue is the full core name (`change:visible`), and the
 * sink gets it as is. `update:<prop>` is Vue's v-model: it goes to the sink
 * too, though the other frameworks have none. Where it goes is the shell's
 * call: the props page prints it to the console with the column's mark, a
 * scenario writes it to the journal of its run.
 */
export function listenersOf(
	descriptors: readonly IComponentDescriptor[],
	sink: TPreviewEventSink,
): TListeners {
	const names = new Set(descriptors.flatMap((descriptor) => useEmits(descriptor)))
	const listeners: TListeners = {}

	for (const name of names) {
		// A listener in Vue markup is the prop `onChange:visible`
		listeners[`on${name[0].toUpperCase()}${name.slice(1)}`] = (...args: unknown[]) =>
			sink(name, args)
	}

	return listeners
}
