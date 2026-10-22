/**
 * setupCalendar — setup-слой Calendar.
 *
 * Два контекста, как у Vue: свой (`CalendarDescriptor` — значение, границы,
 * месяцы, подписи недели и наборы кнопок листания) и фасада коллекции
 * (`CalendarCollectionDescriptor` — режим выбора, сетки, листание и панели
 * выбора месяца и года) на общем наборе. Оба собираются один раз, при
 * инициализации компонента, с тем же id монтирования (`$props.id()`): фасад
 * делит набор календаря, и id у него календаря.
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
 * (`setContext`): день, смонтированный внутри, прочтёт их при своей
 * инициализации и войдёт в коллекцию календаря.
 *
 * Состояние у контекстов своё, а разметка читает его одним видом
 * (`joinState`); атрибуты корня — то, что не съели ни календарь, ни фасад.
 * Связку `useAdapter` разметке не спредом, а поимённо: её `forwardProps` —
 * геттер, и спред прочёл бы его один раз.
 */

import {
	CalendarCollectionDescriptor,
	CalendarDescriptor,
	TCollectionExtension,
} from '@soldy-ui/setup'
import {
	createSvelteAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	useElevator,
	type TRootReceiver,
} from '../../adapter'
import type { CalendarProps } from './base.component'

export function setupCalendar(
	getProps: () => CalendarProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const elevator = useElevator()
	const props = getProps()
	const adapter = createSvelteAdapterContext(CalendarDescriptor(), {
		ctrl: props.ctrl,
		props,
		mountId,
	})
	const owner = useAdapter(adapter, getProps, receive)

	const collectionAdapter = createSvelteAdapterContext(
		CalendarCollectionDescriptor(),
		{
			props,
			mountId,
			// Готовая коллекция снаружи. Дали — фасад работает на ней и своей
			// не создаёт, лишь доложит недостающие расширения в неё же.
			// Не дали — соберёт свою. Развилка в `completeEngine`
			options: { owner: adapter.instance, engine: props.engine },
		},
		{ bundle: adapter.bundle },
	).use(TCollectionExtension, { elevator })

	const collectionBinding = useCollectionAdapter(
		collectionAdapter,
		getProps,
		() => owner.forwardProps,
	)

	return {
		ctrl: owner.ctrl,
		plugins: owner.plugins,
		attachElement: owner.attachElement,
		state: joinState(owner.state, collectionBinding.state),

		get forwardProps() {
			return collectionBinding.forwardProps
		},
	}
}
