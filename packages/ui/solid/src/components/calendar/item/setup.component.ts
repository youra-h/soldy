/**
 * setupCalendarItem — setup-слой дня календаря.
 *
 * Два контекста, как у Vue: собственный (`CalendarItemDescriptor` — дата,
 * номер и наборы, их пишут вид и расширения коллекции) и фасада
 * (`CalendarCollectionItemDescriptor` — членство в коллекции). Расширение
 * элемента берёт лифтом движок и регистратор календаря — из слоя, который день
 * увидел при сборке (`useElevator`), — и отдаёт фасаду контекст дня.
 *
 * Пропсов у фасада нет: выбор и фокус дню пишут расширения коллекции прямо в
 * его наборы. Своего в разметке у дня нет: выбирают его плагины календаря по
 * нажатию и клавишам на корне календаря.
 */

import {
	CalendarCollectionItemDescriptor,
	CalendarItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	joinState,
	useAdapter,
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

	const facade = useCollectionAdapter(item, props, owner.forwardProps)

	return {
		ctrl: owner.ctrl,
		plugins: owner.plugins,
		ref: owner.ref,
		state: joinState(facade.state, owner.state),
		forwardProps: facade.forwardProps,
	}
}
