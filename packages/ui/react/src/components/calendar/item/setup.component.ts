import {
	CalendarCollectionItemDescriptor,
	CalendarItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import { useAdapter, useAdapterContext, useCollectionAdapter } from '../../../adapter'
import type { CalendarItemProps } from './base.component'

export function useSetupCalendarItem(props: CalendarItemProps) {
	const {
		contexts: [adapter, item],
	} = useAdapterContext((create, elevator) => {
		const adapter = create(CalendarItemDescriptor(), { ctrl: props.ctrl, props })

		const item = create(
			CalendarCollectionItemDescriptor(),
			{ props },
			{ bundle: adapter.bundle },
		).use(TCollectionItemExtension, { adapter, elevator })

		return [adapter, item] as const
	})

	return useCollectionAdapter(useAdapter(adapter, props), item, props)
}
