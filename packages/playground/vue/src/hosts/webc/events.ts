import { TSurface, type IComponentDescriptor } from '@soldy-ui/setup'
import { WebcProfile } from '@soldy-ui/webc'
import type { TPreviewEventSink } from '@soldy-ui/playground-shared'

/** A listener of an element's event: the DOM event's name and the handler. */
export type TElementListener = {
	readonly type: string
	readonly listener: (event: Event) => void
}

/**
 * Listeners of all the events of a component or a part, in Web Components.
 *
 * The list is the surface of its descriptors (`componentDescriptors`, or a
 * part's from `TComponentEntry.parts`) in the Web Components profile
 * (`TSurface`): its own events and the props' triggers, and for a collection
 * the facade's too. The element sends `CustomEvent`s by the same surface, so
 * there is a listener for exactly what the component declares. A new event
 * shows up on the playground by itself.
 *
 * The element's event name comes from the same surface: `so:` and the full
 * core name (`so:change:text`, `so:show`). The sink gets the full core name
 * (`change:text`), as from the other hosts, and as arguments what the
 * element's consumer got: one `detail`. Events bubble, so a listener takes
 * only its own element's events, not those bubbled from nested ones: a part's
 * listeners sit on the part's element.
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
