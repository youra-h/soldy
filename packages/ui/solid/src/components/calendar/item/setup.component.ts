import {
	CalendarCollectionItemDescriptor,
	CalendarItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	useAdapter,
	joinBindings,
	useCollectionAdapter,
	useElevator,
} from '../../../adapter'
import type { CalendarItemProps } from './base.component'

export function setupCalendarItem(props: CalendarItemProps) {
	const { elevator } = useElevator()
	const adapter = createSolidAdapterContext(CalendarItemDescriptor(), {
		ctrl: props.ctrl,
		props,
	})

	const item = createSolidAdapterContext(
		CalendarCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter, elevator })

	const itemBinding = useCollectionAdapter(item, props)
	const owner = useAdapter(adapter, props)

	return joinBindings(owner, itemBinding)
}
