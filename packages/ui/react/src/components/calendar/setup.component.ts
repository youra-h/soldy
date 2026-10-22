/**
 * useSetupCalendar — setup-слой Calendar (аналог setup.component.ts во Vue).
 *
 * Два контекста одной сборкой, как у ListBox: свой (`CalendarDescriptor` —
 * значение, границы, месяцы, подписи недели и наборы кнопок листания) и
 * фасада коллекции (`CalendarCollectionDescriptor` — режим выбора, сетки,
 * листание и панели выбора месяца и года) на общем наборе. Фасад собран на
 * инстансе календаря, поэтому пересобираются и уничтожаются они вместе.
 *
 * Логики здесь нет: состав дней, выбор, фокус, листание и панели выбора —
 * расширения коллекции, клавиши и нажатия — плагины календаря на корне,
 * подписи — плагин языка, имена кнопок — плагин имён. Разметка раскладывает
 * то, что они отдали.
 *
 * Движок снаружи — как у остальных коллекций: его держит тот, кто зовёт
 * команды расширений календаря (панель DatePicker). Состава и ключа сверки
 * снаружи нет — дни кладёт в движок вид по месяцам сеток, и ключ у них —
 * дата. Расширение коллекции опускает движок и регистратор дней лифтом
 * компонента; детям его слой (`layer`) отдаёт `Elevate` в разметке: день,
 * смонтированный внутри, прочтёт их при своей сборке и при коммите войдёт в
 * коллекцию календаря.
 */

import {
	CalendarCollectionDescriptor,
	CalendarDescriptor,
	TCollectionExtension,
} from '@soldy-ui/setup'
import { useAdapter, useAdapterContext, useCollectionAdapter } from '../../adapter'
import type { CalendarProps } from './base.component'

export function useSetupCalendar(props: CalendarProps) {
	const {
		contexts: [adapter, collectionAdapter],
		layer,
	} = useAdapterContext((create, elevator) => {
		const adapter = create(CalendarDescriptor(), { ctrl: props.ctrl, props })

		const collectionAdapter = create(
			CalendarCollectionDescriptor(),
			{
				props,
				// Готовая коллекция снаружи. Дали — фасад работает на ней и своей
				// не создаёт, лишь доложит недостающие расширения в неё же.
				// Не дали — соберёт свою. Развилка в `completeEngine`
				options: { owner: adapter.instance, engine: props.engine },
			},
			{ bundle: adapter.bundle },
		).use(TCollectionExtension, { elevator })

		return [adapter, collectionAdapter] as const
	})

	const owner = useAdapter(adapter, props)
	const collectionBinding = useCollectionAdapter(collectionAdapter, props, owner.forwardProps)

	return {
		...owner,
		forwardProps: collectionBinding.forwardProps,
		state: { ...owner.state, ...collectionBinding.state },
		layer,
	}
}
