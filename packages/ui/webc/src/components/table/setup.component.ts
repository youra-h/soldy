/**
 * setupTable — setup-слой Table.
 *
 * Два контекста, как у Vue и у ListBox: собственный (`TableDescriptor` — язык,
 * имя чекбокса «выбрать все», закреплённая шапка, раскладка колонок) и
 * коллекционный (`TableCollectionDescriptor` — строки, колонки, выбор,
 * сортировка, сетка) на общем наборе, одной связкой.
 *
 * Расширение коллекции опускает движок и регистратор строк лифтом — хосту
 * таблицы: строки, которые таблица рисует внутри, находят их вверх по
 * документу и входят в её коллекцию. Окно обёртки `Virtual` над таблицей
 * фасад подхватывает тем же лифтом (`TVirtualCollectionExtension`), а своему
 * поддереву опускает пустое подключение.
 *
 * `engine` — готовая коллекция строк снаружи, свойство элемента
 * (`el.engine`): фасад работает на ней, а без неё собирает свою
 * (`completeEngine`).
 *
 * Логики здесь нет: показанные колонки и строки, ячейки, счёт выбора и порядок
 * строк — расширения коллекции, а разметка раскладывает то, что они отдали.
 */

import {
	TCollectionExtension,
	TVirtualCollectionExtension,
	TableCollectionDescriptor,
	TableDescriptor,
} from '@soldy-ui/setup'
import type { ITable, TTableCollectionFacade } from '@soldy-ui/core'
import {
	createWebcAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'
import { createWebcElevator } from '../../adapter/elevator'

export function setupTable(
	host: HTMLElement,
	ctrl: ITable | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<ITable, TTableCollectionFacade> {
	const adapter = createWebcAdapterContext(host, TableDescriptor(), { ctrl, props })
	const owner = useAdapter(adapter, host, onUpdate)
	const elevator = createWebcElevator(host)

	const collectionAdapter = createWebcAdapterContext(
		host,
		TableCollectionDescriptor(),
		{ props, options: { owner: adapter.instance, engine: props['engine'] } },
		{ bundle: adapter.bundle },
	)
		.use(TCollectionExtension, { elevator })
		// Окно обёртки `Virtual` над таблицей: подхват при сборке, подписка на
		// обёртку — при приёме, снятие — с уничтожением
		.use(TVirtualCollectionExtension, { elevator })

	return joinBindings(owner, useCollectionAdapter(collectionAdapter, host, onUpdate))
}
