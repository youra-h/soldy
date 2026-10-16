/**
 * setupListBox — setup-слой ListBox.
 *
 * Два контекста, как у Vue и Angular: свой (`ListBoxDescriptor`) и фасада
 * коллекции (`ListBoxCollectionDescriptor`) на общем наборе, одной связкой.
 *
 * Расширения коллекции опускают движок и регистратор элементов лифтом —
 * хосту списка: элементы, что стоят ниже, находят их вверх по документу и
 * входят в коллекцию списка, а список в слоте элемента — в свою. Окно обёртки
 * `Virtual` над списком фасад подхватывает тем же лифтом
 * (`TVirtualCollectionExtension`), а своему поддереву опускает пустое
 * подключение: списки в слотах элементов окна не наследуют.
 *
 * `engine` — готовая коллекция снаружи, свойство элемента (`el.engine`):
 * фасад работает на ней, а без неё собирает свою (`completeEngine`).
 */

import {
	ListBoxCollectionDescriptor,
	ListBoxDescriptor,
	TCollectionExtension,
	TDragAndDropCollectionExtension,
	TVirtualCollectionExtension,
} from '@soldy-ui/setup'
import type { IListBox, TListBoxCollectionFacade } from '@soldy-ui/core'
import {
	createWebcAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'
import { createWebcElevator } from '../../adapter/elevator'

export function setupListBox(
	host: HTMLElement,
	ctrl: IListBox | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IListBox, TListBoxCollectionFacade> {
	const adapter = createWebcAdapterContext(host, ListBoxDescriptor(), { ctrl, props })
	const owner = useAdapter(adapter, host, onUpdate)
	const elevator = createWebcElevator(host)

	const collectionAdapter = createWebcAdapterContext(
		host,
		ListBoxCollectionDescriptor(),
		{ props, options: { owner: adapter.instance, engine: props['engine'] } },
		{ bundle: adapter.bundle },
	)
		.use(TCollectionExtension, { elevator })
		.use(TDragAndDropCollectionExtension, { elevator })
		// Окно обёртки `Virtual` над списком: подхват при сборке, подписка на
		// обёртку — при приёме, снятие — с уничтожением
		.use(TVirtualCollectionExtension, { elevator })

	return joinBindings(owner, useCollectionAdapter(collectionAdapter, adapter, host, onUpdate))
}
