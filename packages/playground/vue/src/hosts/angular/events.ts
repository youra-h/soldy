import { EventEmitter, InjectionToken } from '@angular/core'
import { TSurface, type IComponentDescriptor } from '@soldy-ui/setup'
import { AngularProfile } from '@soldy-ui/angular'
import type { TPreviewEventSink } from '@soldy-ui/playground-shared'

/** A listener of a component's output: the output's name and the handler. */
export type TOutputListener = {
	readonly output: string
	readonly listener: (value: unknown) => void
}

/**
 * Listeners of all the events of a component or a part, in Angular.
 *
 * The list is the surface of its descriptors (`componentDescriptors`, or a
 * part's from `TComponentEntry.parts`) in the Angular profile (`TSurface`):
 * its own events and the props' triggers, and for a collection the facade's
 * too. The adapter declares the component's outputs by the same surface, so
 * there is a listener for exactly what the component declares. A new event
 * shows up on the playground by itself.
 *
 * The output's name is Angular's (`soChangeText`), and the sink gets the full
 * core name (`change:text`): the scenario journal and the page console are the
 * same for all frameworks. The argument is what the output's consumer got: the
 * first argument of the core event, the one its output sends. `update:<prop>`
 * is Vue's v-model; Angular has none.
 */
export function listenersOf(
	descriptors: readonly IComponentDescriptor[],
	sink: TPreviewEventSink,
): readonly TOutputListener[] {
	return descriptors.flatMap((descriptor) =>
		TSurface.of(descriptor, AngularProfile).events.map(({ name, exportName }) => ({
			output: exportName,
			listener: (value: unknown) => sink(name.getName(), [value]),
		})),
	)
}

/**
 * Subscribes the listeners to a component's outputs, like `(soChangeText)`
 * bindings in a consumer's template. An adapter output is a getter, and its
 * first read creates the emitter. An output the surface declares but the
 * component lacks is a mismatch between the adapter and the descriptor, and
 * it throws. Returns the unsubscribe function.
 */
export function listen(component: object, listeners: readonly TOutputListener[]): () => void {
	const subscriptions = listeners.map(({ output, listener }) => {
		const emitter: unknown = Reflect.get(component, output)

		if (!(emitter instanceof EventEmitter)) {
			throw new Error(`[playground] у ${component.constructor.name} нет выхода «${output}»`)
		}

		return emitter.subscribe(listener)
	})

	return () => {
		for (const subscription of subscriptions) subscription.unsubscribe()
	}
}

/**
 * Listeners of the preview's parts, by part name (`partsOf`): the host
 * provides them in the preview's injector, and each part marked `pg-part` in
 * its markup takes its own (`PartDirective`).
 */
export const PART_LISTENERS = new InjectionToken<
	Readonly<Record<string, readonly TOutputListener[]>>
>('PART_LISTENERS')
