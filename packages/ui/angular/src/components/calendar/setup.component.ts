import {
	CalendarCollectionDescriptor,
	CalendarDescriptor,
	TCollectionExtension,
} from '@soldy-ui/setup'
import type { ICalendar, ICalendarProps, TCalendarCollectionFacade } from '@soldy-ui/core'
import {
	AngularElevatorFactory,
	createAngularAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../adapter'
import type { TBinding } from '../../adapter'

/**
 * setupCalendar — setup-слой Calendar.
 *
 * Два контекста, как у Vue и ListBox: свой (`CalendarDescriptor` — значение,
 * границы, недоступные дни, первый день недели, месяцы сеток) и фасада
 * коллекции (`CalendarCollectionDescriptor` — режим выбора, сетки, листание,
 * панели выбора месяца и года) на общем наборе. Оба собираются один раз, в
 * `ngOnInit`, в контексте инъекции календаря, и база получает их одной
 * связкой (`joinBindings`).
 *
 * Расширения коллекции опускают движок и регистратор дней лифтом — в слой
 * календаря (`provideElevator()` в его `providers`): день, собранный внутри,
 * прочтёт их при своей сборке и войдёт в коллекцию календаря. Окна и
 * перестановки у календаря нет: дни кладёт в движок вид по месяцам сеток.
 *
 * `engine` — готовая коллекция снаружи, вход календаря: его держит тот, кто
 * зовёт команды расширений календаря (панель DatePicker). Дали — фасад
 * работает на ней и своей не создаёт, лишь доложит недостающие расширения в
 * неё же. Не дали — соберёт свою. Развилка в `completeEngine`.
 *
 * Логики здесь нет: состав дней, выбор, фокус, листание и панели выбора —
 * расширения коллекции, клавиши — `TCalendarKeyboardPlugin`, нажатия и
 * наведение — `TCalendarPointerPlugin`, `id` заголовков и шапок —
 * `TCalendarIdsPlugin`, имена кнопок — `TCalendarNamesPlugin` по локали
 * поддерева.
 */
export function setupCalendar(
	ctrl: ICalendar | undefined,
	props: object,
	engine: ICalendarProps['engine'],
): TBinding<ICalendar, TCalendarCollectionFacade> {
	const adapter = createAngularAdapterContext(CalendarDescriptor(), { ctrl, props })
	const owner = useAdapter(adapter)

	const collectionAdapter = createAngularAdapterContext(
		CalendarCollectionDescriptor(),
		{ props, options: { owner: adapter.instance, engine } },
		{ bundle: adapter.bundle },
	).use(TCollectionExtension, { elevator: AngularElevatorFactory })

	return joinBindings(owner, useCollectionAdapter(collectionAdapter))
}
