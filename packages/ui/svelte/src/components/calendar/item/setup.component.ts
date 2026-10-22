/**
 * setupCalendarItem — setup-слой дня календаря.
 *
 * Два контекста, как у элементов Vue: собственный (`CalendarItemDescriptor` —
 * дата, номер и наборы, их пишут вид и расширения коллекции) и фасада
 * (`CalendarCollectionItemDescriptor` — членство в коллекции). Расширение
 * элемента берёт лифтом движок и регистратор календаря и отдаёт фасаду
 * контекст дня.
 *
 * В коллекцию день входит, когда контекст фасада принят, — при инициализации
 * компонента, и на сервере тоже: день есть в серверной разметке вместе с тем,
 * что пишет ему коллекция, — остановкой Tab, выбором, именем.
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
	createSvelteAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	useElevator,
	type TRootReceiver,
} from '../../../adapter'
import type { CalendarItemProps } from './base.component'

export function setupCalendarItem(
	getProps: () => CalendarItemProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const elevator = useElevator()
	const props = getProps()
	const adapter = createSvelteAdapterContext(CalendarItemDescriptor(), {
		ctrl: props.ctrl,
		props,
		mountId,
	})
	const owner = useAdapter(adapter, getProps, receive)

	const item = createSvelteAdapterContext(
		CalendarCollectionItemDescriptor(),
		{ props, mountId },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator })

	const facade = useCollectionAdapter(item, getProps, () => owner.forwardProps)

	return {
		ctrl: owner.ctrl,
		plugins: owner.plugins,
		attachElement: owner.attachElement,
		state: joinState(facade.state, owner.state),

		get forwardProps() {
			return facade.forwardProps
		},
	}
}
