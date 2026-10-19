/**
 * setupTable — setup-слой Table.
 *
 * Два контекста, как у ListBox: свой (`TableDescriptor` — язык, имя чекбокса
 * «выбрать все», закреплённая шапка) и фасада коллекции строк
 * (`TableCollectionDescriptor` — строки, колонки, выбор и сортировка) на общем
 * наборе. Оба собираются один раз, при инициализации компонента, с тем же id
 * монтирования (`$props.id()`): фасад делит набор таблицы, и id у него
 * таблицы.
 *
 * Расширения коллекции опускают движок и регистратор строк лифтом
 * (`setContext`): строка, смонтированная внутри, прочтёт их при своей
 * инициализации и войдёт в коллекцию таблицы. Окно обёртки `Virtual` над
 * таблицей фасад подхватывает тем же лифтом (`TVirtualCollectionExtension`), а
 * своему поддереву опускает пустое подключение: списки в ячейках окна не
 * наследуют.
 *
 * Логики здесь нет: показанные колонки и строки, ячейки, счёт выбора и
 * порядок строк — расширения коллекции, а разметка раскладывает то, что они
 * отдали. Разметке уходит инстанс фасада (`facade`): чекбокс «выбрать все» —
 * экземпляр, который держит таблица, а состоянием он не отдаётся. Корень
 * таблицы стоит внутри окна, поэтому из attachment-а корня разметке уходят обе
 * половины по отдельности: привязка корня (`bindRef`) и запись `ref` окну
 * (`consumerRef`).
 */

import {
	TCollectionExtension,
	TVirtualCollectionExtension,
	TableCollectionDescriptor,
	TableDescriptor,
} from '@soldy-ui/setup'
import {
	SvelteElevatorFactory,
	createSvelteAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	type TRootReceiver,
} from '../../adapter'
import type { TableProps } from './base.component'

export function setupTable(getProps: () => TableProps, mountId: string, receive: TRootReceiver) {
	const props = getProps()
	const adapter = createSvelteAdapterContext(TableDescriptor(), {
		ctrl: props.ctrl,
		props,
		mountId,
	})
	const owner = useAdapter(adapter, getProps, receive)

	const collectionAdapter = createSvelteAdapterContext(
		TableCollectionDescriptor(),
		{
			props,
			mountId,
			// Готовая коллекция снаружи. Дали — фасад работает на ней и своей
			// не создаёт, лишь доложит недостающие расширения в неё же.
			// Не дали — соберёт свою. Развилка в `completeEngine`
			options: { owner: adapter.instance, engine: props.engine },
		},
		{ bundle: adapter.bundle },
	)
		.use(TCollectionExtension, { elevator: SvelteElevatorFactory })
		// Окно обёртки `Virtual` над таблицей: подхват при сборке, подписка на
		// обёртку — при приёме, снятие — с уничтожением
		.use(TVirtualCollectionExtension, { elevator: SvelteElevatorFactory })

	const collectionBinding = useCollectionAdapter(
		collectionAdapter,
		getProps,
		() => owner.forwardProps,
	)

	return {
		ctrl: owner.ctrl,
		plugins: owner.plugins,
		bindRef: owner.bindRef,
		consumerRef: owner.consumerRef,
		state: joinState(owner.state, collectionBinding.state),
		facade: collectionAdapter.instance,

		get forwardProps() {
			return collectionBinding.forwardProps
		},
	}
}
