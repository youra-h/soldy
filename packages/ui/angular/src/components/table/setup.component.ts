import {
	TCollectionExtension,
	TVirtualCollectionExtension,
	TableCollectionDescriptor,
	TableDescriptor,
} from '@soldy-ui/setup'
import type { ITable, ITableProps, TTableCollectionFacade } from '@soldy-ui/core'
import {
	AngularElevatorFactory,
	createAngularAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../adapter'
import type { TBinding } from '../../adapter'

/**
 * setupTable — setup-слой Table.
 *
 * Два контекста, как у ListBox: свой (`TableDescriptor` — язык, имя чекбокса
 * «выбрать все», закреплённая шапка) и фасада коллекции строк
 * (`TableCollectionDescriptor` — строки, колонки, выбор и сортировка) на общем
 * наборе. Оба собираются один раз, в `ngOnInit`, в контексте инъекции таблицы,
 * и база получает их одной связкой (`joinBindings`).
 *
 * Расширения коллекции опускают движок и регистратор строк лифтом — в слой
 * таблицы (`provideElevator()` в её `providers`): строка, собранная в её
 * шаблоне, прочтёт их при своей сборке и войдёт в коллекцию таблицы. Окно
 * обёртки `Virtual` над таблицей фасад подхватывает тем же лифтом
 * (`TVirtualCollectionExtension`), а своему поддереву опускает пустое
 * подключение: списки в ячейках окна не наследуют.
 *
 * Логики здесь нет: показанные колонки и строки, ячейки, счёт выбора и
 * порядок строк — расширения коллекции, а разметка раскладывает то, что они
 * отдали. Чекбокс «выбрать все» — экземпляр, который держит таблица: шаблон
 * берёт его у фасада (`facade()`), состоянием он не отдаётся.
 *
 * `engine` — готовая коллекция снаружи, вход таблицы. Дали — фасад работает на
 * ней и своей не создаёт, лишь доложит недостающие расширения в неё же. Не
 * дали — соберёт свою. Развилка в `completeEngine`.
 */
export function setupTable(
	ctrl: ITable | undefined,
	props: object,
	engine: ITableProps['engine'],
): TBinding<ITable, TTableCollectionFacade> {
	const adapter = createAngularAdapterContext(TableDescriptor(), { ctrl, props })
	const owner = useAdapter(adapter)

	const collectionAdapter = createAngularAdapterContext(
		TableCollectionDescriptor(),
		{ props, options: { owner: adapter.instance, engine } },
		{ bundle: adapter.bundle },
	)
		.use(TCollectionExtension, { elevator: AngularElevatorFactory })
		// Окно обёртки `Virtual` над таблицей: подхват при сборке, подписка на
		// обёртку — при приёме, снятие — с уничтожением
		.use(TVirtualCollectionExtension, { elevator: AngularElevatorFactory })

	return joinBindings(owner, useCollectionAdapter(collectionAdapter))
}
