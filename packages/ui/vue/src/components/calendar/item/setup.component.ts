import {
	TCollectionItemExtension,
	CalendarItemDescriptor,
	CalendarCollectionItemDescriptor,
} from '@soldy-ui/setup'
import {
	useAdapter,
	VueElevatorFactory,
	createVueAdapterContext,
	type SetupContext,
} from '../../../adapter'
import BaseCalendarItem, { type CalendarItemProps } from './base.component'

/**
 * День календаря: свой контекст и контекст фасада дня на одном наборе. Своего
 * у дня в разметке нет — дату, номер и наборы ему пишут вид и расширения
 * коллекции, а выбирают его плагины календаря по нажатию и клавишам на корне
 * календаря.
 */
export default {
	name: '_CalendarItem',
	extends: BaseCalendarItem,
	setup(props: CalendarItemProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(CalendarItemDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		const itemAdapter = createVueAdapterContext(
			CalendarCollectionItemDescriptor(),
			{ props },
			{ bundle: adapter.bundle },
		).use(TCollectionItemExtension, {
			item: adapter.instance,
			elevator: VueElevatorFactory,
		})

		const itemBinding = useAdapter(itemAdapter, props, emit)
		const ownerBinding = useAdapter(adapter, props, emit)

		return { ...itemBinding, ...ownerBinding }
	},
}
