/**
 * setupTable — setup-слой Table.
 *
 * Два контекста, как у ListBox: свой (`TableDescriptor` — язык, имя чекбокса
 * «выбрать все», закреплённая шапка) и фасада коллекции строк
 * (`TableCollectionDescriptor` — строки, колонки, выбор и сортировка) на общем
 * наборе. Оба собираются один раз, при выполнении тела компонента; фасад
 * делит набор таблицы, и id монтирования у него таблицы.
 *
 * Расширения коллекции опускают движок и регистратор строк в слой лифта
 * таблицы (`useElevator`), детям его отдаёт `Elevate` в разметке: строка,
 * смонтированная внутри, прочтёт их при своей сборке и войдёт в коллекцию
 * таблицы. Окно обёртки `Virtual` над таблицей фасад подхватывает тем же
 * лифтом (`TVirtualCollectionExtension`), а своему поддереву опускает пустое
 * подключение: списки в ячейках окна не наследуют.
 *
 * Логики здесь нет: показанные колонки и строки, ячейки, счёт выбора и
 * порядок строк — расширения коллекции, а разметка раскладывает то, что они
 * отдали. Разметке уходит инстанс фасада (`facade`): чекбокс «выбрать все» —
 * экземпляр, который держит таблица, а состоянием он не отдаётся. Корень
 * таблицы стоит внутри окна, поэтому из `ref` адаптера разметке уходят обе
 * половины по отдельности: привязка корня (`bindRef`) и `ref` потребителя
 * окну (`consumerRef`).
 */

import {
	TCollectionExtension,
	TVirtualCollectionExtension,
	TableCollectionDescriptor,
	TableDescriptor,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	useElevator,
} from '../../adapter'
import type { TableProps } from './base.component'

export function setupTable(props: TableProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(TableDescriptor(), { ctrl: props.ctrl, props })
	const owner = useAdapter(adapter, props)

	const collectionAdapter = createSolidAdapterContext(
		TableCollectionDescriptor(),
		{
			props,
			// Готовая коллекция снаружи. Дали — фасад работает на ней и своей
			// не создаёт, лишь доложит недостающие расширения в неё же.
			// Не дали — соберёт свою. Развилка в `completeEngine`
			options: { owner: adapter.instance, engine: props.engine },
		},
		{ bundle: adapter.bundle },
	)
		.use(TCollectionExtension, { elevator })
		// Окно обёртки `Virtual` над таблицей: подхват при сборке, подписка на
		// обёртку — при приёме, снятие — с уничтожением
		.use(TVirtualCollectionExtension, { elevator })

	const collectionBinding = useCollectionAdapter(collectionAdapter, props, owner.forwardProps)

	return {
		ctrl: owner.ctrl,
		plugins: owner.plugins,
		bindRef: owner.bindRef,
		consumerRef: owner.consumerRef,
		state: joinState(owner.state, collectionBinding.state),
		forwardProps: collectionBinding.forwardProps,
		layer,
		facade: collectionAdapter.instance,
	}
}
