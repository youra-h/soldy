/**
 * useSetupTable — setup-слой Table (аналог setup.component.ts во Vue).
 *
 * Два контекста одной сборкой, как у ListBox: свой (`TableDescriptor` — язык,
 * имя чекбокса «выбрать все», закреплённая шапка) и фасада коллекции строк
 * (`TableCollectionDescriptor` — строки, колонки, выбор и сортировка) на
 * общем наборе. Фасад собран на инстансе владельца, поэтому пересобираются и
 * уничтожаются они вместе.
 *
 * Расширения коллекции опускают движок и регистратор строк лифтом компонента;
 * детям его слой (`layer`) отдаёт `Elevate` в разметке. Окно обёртки
 * `Virtual` над таблицей фасад подхватывает тем же лифтом
 * (`TVirtualCollectionExtension`), а своему поддереву опускает пустое
 * подключение: списки в ячейках окна не наследуют.
 *
 * Логики здесь нет: показанные колонки и строки, ячейки, счёт выбора и
 * порядок строк — расширения коллекции, а разметка раскладывает то, что они
 * отдали. Разметке уходит инстанс фасада (`facade`): чекбокс «выбрать все» —
 * экземпляр, который держит таблица, а состоянием он не отдаётся. Кнопку
 * сортировки рисует заголовок колонки, и её нажатие — просьба колонки,
 * которую выполняет коллекция.
 */

import {
	TCollectionExtension,
	TVirtualCollectionExtension,
	TableCollectionDescriptor,
	TableDescriptor,
} from '@soldy-ui/setup'
import { useAdapter, useAdapterContext, useCollectionAdapter } from '../../adapter'
import type { TableProps } from './base.component'

export function useSetupTable(props: TableProps) {
	const {
		contexts: [adapter, collectionAdapter],
		layer,
	} = useAdapterContext((create, elevator) => {
		const adapter = create(TableDescriptor(), { ctrl: props.ctrl, props })

		const collectionAdapter = create(
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
			// обёртку — при коммите, снятие — с уничтожением
			.use(TVirtualCollectionExtension, { elevator })

		return [adapter, collectionAdapter] as const
	})

	const owner = useAdapter(adapter, props)
	const collectionBinding = useCollectionAdapter(collectionAdapter, props, owner.forwardProps)

	return {
		...owner,
		forwardProps: collectionBinding.forwardProps,
		state: { ...owner.state, ...collectionBinding.state },
		layer,
		facade: collectionAdapter.instance,
	}
}
