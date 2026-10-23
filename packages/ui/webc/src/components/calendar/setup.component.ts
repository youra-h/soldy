import {
	CalendarCollectionDescriptor,
	CalendarDescriptor,
	TCollectionExtension,
} from '@soldy-ui/setup'
import type { ICalendar, TCalendarCollectionFacade } from '@soldy-ui/core'
import {
	createWebcAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'
import { createWebcElevator } from '../../adapter/elevator'

export function setupCalendar(
	host: HTMLElement,
	ctrl: ICalendar | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<ICalendar, TCalendarCollectionFacade> {
	const adapter = createWebcAdapterContext(host, CalendarDescriptor(), { ctrl, props })
	const owner = useAdapter(adapter, host, onUpdate)

	const collectionAdapter = createWebcAdapterContext(
		host,
		CalendarCollectionDescriptor(),
		{ props, options: { owner: adapter.instance, engine: props['engine'] } },
		{ bundle: adapter.bundle },
	).use(TCollectionExtension, { elevator: createWebcElevator(host) })

	return joinBindings(owner, useCollectionAdapter(collectionAdapter, host, onUpdate))
}
