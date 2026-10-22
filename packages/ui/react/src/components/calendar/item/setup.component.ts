/**
 * useSetupCalendarItem — setup-слой дня календаря (аналог setup.component.ts во Vue).
 *
 * Два контекста одной сборкой, как у элемента ListBox: собственный
 * (`CalendarItemDescriptor` — дата, номер и наборы, их пишут вид и расширения
 * коллекции) и фасада (`CalendarCollectionItemDescriptor` — членство в
 * коллекции). Расширение элемента берёт через лифт движок и регистратор
 * календаря и отдаёт фасаду контекст дня.
 *
 * В коллекцию день входит, когда `useAdapterContext` принимает контексты при
 * коммите, а не на рендере. Пересобранный календарь без движка снаружи — это
 * новый движок: день пересобирается вслед за ним, потому что сменилось
 * прочитанное через лифт.
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
		).use(TCollectionItemExtension, { item: adapter.instance, elevator })

		return [adapter, item] as const
	})

	const owner = useAdapter(adapter, props)
	const facade = useCollectionAdapter(item, props, owner.forwardProps)

	return {
		...owner,
		forwardProps: facade.forwardProps,
		state: { ...facade.state, ...owner.state },
	}
}
