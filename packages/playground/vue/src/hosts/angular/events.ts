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
 * Listeners of all the events of a component or a part — in Angular.
 *
 * The list is the surface of its descriptors (`componentDescriptors`, a
 * part's — `TComponentEntry.parts`) in the Angular profile (`TSurface`): own
 * events and the props' triggers, of a collection — the facade's too. The
 * adapter declares the component's outputs by the same surface, so there is a
 * listener for exactly what the component declared. An event added appears on
 * the stand by itself.
 *
 * The output's name is Angular's (`soChangeText`), and the sink gets the full
 * core name (`change:text`): the scenario journal and the page console are one
 * for all frameworks. The argument is what the output's consumer got: the
 * first argument of the core event, the one its output sends. `update:<prop>`
 * is Vue's v-model, Angular has none.
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
 * Subscribe the listeners to a component's outputs — as the bindings
 * `(soChangeText)` in a consumer's template. An output of the adapter is a
 * getter, and its first read creates the emitter. An output the surface
 * declares and the component lacks is a mismatch of the adapter with the
 * descriptor, and it is not muted. Returns the unsubscription.
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
 * Listeners of the preview's parts, by part name (`partsOf`): the host gives
 * them to the injector of the preview, and the parts marked `pg-part` in its
 * markup take theirs (`PartDirective`).
 */
export const PART_LISTENERS = new InjectionToken<
	Readonly<Record<string, readonly TOutputListener[]>>
>('PART_LISTENERS')
