/**
 * setupCalendar — setup-слой Calendar.
 *
 * Два контекста, как у Vue: свой (`CalendarDescriptor` — значение, границы,
 * недоступные дни, первый день недели, пояс «сегодня», месяцы сеток) и фасада
 * коллекции (`CalendarCollectionDescriptor` — режим выбора, сетки, листание и
 * панели выбора месяца и года) на общем наборе, одной связкой. Логики здесь
 * нет: состав дней, выбор, фокус, листание и панели выбора — расширения
 * коллекции, клавиши и нажатия — плагины календаря. Шаблон раскладывает то,
 * что они отдали.
 *
 * Расширение коллекции опускает движок и регистратор дней лифтом — хосту
 * календаря: дни, которые рисует шаблон, находят их вверх по документу и
 * входят в коллекцию календаря.
 *
 * `engine` — готовая коллекция снаружи, свойство элемента (`el.engine`): её
 * держит тот, кто зовёт команды расширений календаря (панель DatePicker), и
 * фасад работает на ней, а без неё собирает свою (`completeEngine`). Состава и
 * ключа сверки снаружи нет — дни кладёт в движок вид по месяцам сеток, и ключ
 * у них — дата.
 */

import {
	CalendarCollectionDescriptor,
	CalendarDescriptor,
	TCollectionExtension,
} from '@soldy-ui/setup'
import type { ICalendar, TCalendarCollectionFacade } from '@soldy-ui/core'
import {
	createWebcAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'
import { createWebcElevator } from '../../adapter/elevator'

export function setupCalendar(
	host: HTMLElement,
	ctrl: ICalendar | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<ICalendar, TCalendarCollectionFacade> {
	const adapter = createWebcAdapterContext(host, CalendarDescriptor(), { ctrl, props })
	const owner = useAdapter(adapter, host, onUpdate)

	const collectionAdapter = createWebcAdapterContext(
		host,
		CalendarCollectionDescriptor(),
		{ props, options: { owner: adapter.instance, engine: props['engine'] } },
		{ bundle: adapter.bundle },
	).use(TCollectionExtension, { elevator: createWebcElevator(host) })

	return joinBindings(owner, useCollectionAdapter(collectionAdapter, host, onUpdate))
}
