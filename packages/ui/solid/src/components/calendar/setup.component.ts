/**
 * setupCalendar — setup-слой Calendar.
 *
 * Два контекста, как у Vue: свой (`CalendarDescriptor` — значение, границы,
 * месяцы, подписи недели и наборы кнопок листания) и фасада коллекции
 * (`CalendarCollectionDescriptor` — режим выбора, сетки, листание и панели
 * выбора месяца и года) на общем наборе. Оба собираются один раз, при
 * выполнении тела компонента; фасад делит набор календаря, и id монтирования
 * у него календаря.
 *
 * Логики здесь нет: состав дней, выбор, фокус, листание и панели выбора —
 * расширения коллекции, клавиши и нажатия — плагины календаря на корне,
 * подписи — плагин языка, имена кнопок — плагин имён. Разметка раскладывает
 * то, что они отдали.
 *
 * Движок снаружи — как у остальных коллекций: его держит тот, кто зовёт
 * команды расширений календаря (панель DatePicker). Состава и ключа сверки
 * снаружи нет — дни кладёт в движок вид по месяцам сеток, и ключ у них —
 * дата. Расширение коллекции опускает движок и регистратор дней в слой лифта
 * календаря (`useElevator`), детям его отдаёт `Elevate` в разметке: день,
 * смонтированный внутри, привязывается к своей записи коллекции.
 */

import {
	CalendarCollectionDescriptor,
	CalendarDescriptor,
	TCollectionExtension,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	useElevator,
} from '../../adapter'
import type { CalendarProps } from './base.component'

export function setupCalendar(props: CalendarProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(CalendarDescriptor(), {
		ctrl: props.ctrl,
		props,
	})
	const owner = useAdapter(adapter, props)

	const collectionAdapter = createSolidAdapterContext(
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

	const collectionBinding = useCollectionAdapter(collectionAdapter, props, owner.forwardProps)

	return {
		ctrl: owner.ctrl,
		plugins: owner.plugins,
		ref: owner.ref,
		state: joinState(owner.state, collectionBinding.state),
		forwardProps: collectionBinding.forwardProps,
		layer,
	}
}
