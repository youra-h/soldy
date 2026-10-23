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
	const owner = useAdapter(adapter, props)

	const item = createSolidAdapterContext(
		CalendarCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator })

	const itemBinding = useCollectionAdapter(item, props, owner.forwardProps)

	return joinBindings(owner, itemBinding)
}
