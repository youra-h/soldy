import {
	TCollectionItemExtension,
	TableCollectionRowDescriptor,
	TableRowDescriptor,
} from '@soldy-ui/setup'
import type { ITableRow, TTableRowCollectionFacade } from '@soldy-ui/core'
import {
	AngularElevatorFactory,
	createAngularAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding } from '../../../adapter'

/**
 * setupTableRow — setup-слой строки таблицы.
 *
 * Два контекста, как у элементов Vue и Svelte: собственный
 * (`TableRowDescriptor` — запись, «выключена», наборы) и фасада
 * (`TableCollectionRowDescriptor` — выбор, ячейки, имя строки, выбор строк).
 * Расширение элемента берёт лифтом из слоя таблицы движок и регистратор строк
 * и отдаёт фасаду контекст строки.
 *
 * Строку рисует таблица — по записи `drawn` над элементом своей коллекции, — и
 * контекст фасада строка принимает в `ngOnInit`, на сервере тоже: сервер
 * рисует строку со всем, что пишут ей коллекция и таблица, — выбором,
 * ячейками, ссылкой чекбокса на заголовок строки.
 *
 * Чекбокс выбора строки — экземпляр, который держит таблица: шаблон берёт его
 * у контекста строки (`context.adapters.table`) и только в ячейке выбора,
 * поэтому у таблицы без выбора чекбоксов строк нет вовсе.
 */
export function setupTableRow(
	ctrl: ITableRow | undefined,
	props: object,
): TBinding<ITableRow, TTableRowCollectionFacade> {
	const adapter = createAngularAdapterContext(TableRowDescriptor(), { ctrl, props })
	const owner = useAdapter(adapter)

	const item = createAngularAdapterContext(
		TableCollectionRowDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator: AngularElevatorFactory })

	return joinBindings(owner, useCollectionAdapter(item))
}
