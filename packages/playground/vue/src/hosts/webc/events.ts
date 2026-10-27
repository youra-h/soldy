import { TSurface, type IComponentDescriptor } from '@soldy-ui/setup'
import { WebcProfile } from '@soldy-ui/webc'
import type { TPreviewEventSink } from '@soldy-ui/playground-shared'

/** A listener of an element's event: the DOM event's name and the handler. */
export type TElementListener = {
	readonly type: string
	readonly listener: (event: Event) => void
}

/**
 * Listeners of all the events of a component or a part — in Web Components.
 *
 * The list is the surface of its descriptors (`componentDescriptors`, a
 * part's — `TComponentEntry.parts`) in the Web Components profile
 * (`TSurface`): own events and the props' triggers, of a collection — the
 * facade's too. The element sends `CustomEvent`s by the same surface, so there
 * is a listener for exactly what the component declared. An event added
 * appears on the stand by itself.
 *
 * The element's event name is from the same surface: `so:` and the full core
 * name (`so:change:text`, `so:show`). The sink gets the full core name
 * (`change:text`), as from the other hosts. The arguments are what the
 * element's consumer got: one `detail`. An event bubbles, and a listener takes
 * only the events of its own element — not those bubbled from the nested ones:
 * a part's listeners stand on the part's element.
 */
export function listenersOf(
	descriptors: readonly IComponentDescriptor[],
	sink: TPreviewEventSink,
): readonly TElementListener[] {
	return descriptors.flatMap((descriptor) =>
		TSurface.of(descriptor, WebcProfile).events.map(({ name, exportName }) => ({
			type: exportName,
			listener: (event: Event) => {
				if (event.target !== event.currentTarget) return

				sink(name.getName(), [event instanceof CustomEvent ? event.detail : undefined])
			},
		})),
	)
}
