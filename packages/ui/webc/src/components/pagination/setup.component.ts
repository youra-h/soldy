/**
 * setupPagination — setup-слой Pagination.
 *
 * Два контекста, как у Vue и ListBox: свой (`PaginationDescriptor`) и фасада
 * коллекции (`PaginationCollectionDescriptor`) на общем наборе, одной связкой.
 * Логики здесь нет: страницы окна, текущую, пропуски и связь текущей со
 * значением держит расширение коллекции `pagination`, выключенность стрелок и
 * переход на соседнюю страницу — сама пагинация, имена стрелок — плагин имён.
 *
 * Расширение коллекции опускает движок и регистратор страниц лифтом — хосту
 * пагинации: страницы, которые рисует шаблон, находят их вверх по документу и
 * входят в коллекцию пагинации.
 *
 * `engine` — готовая коллекция снаружи, свойство элемента (`el.engine`):
 * фасад работает на ней, а без неё собирает свою (`completeEngine`). Состава
 * и ключа сверки снаружи нет — страницы окна кладёт в движок расширение
 * пагинации, и ключ у них — ключ страницы.
 */

import {
	PaginationCollectionDescriptor,
	PaginationDescriptor,
	TCollectionExtension,
} from '@soldy-ui/setup'
import type { IPagination, TPaginationCollectionFacade } from '@soldy-ui/core'
import {
	createWebcAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'
import { createWebcElevator } from '../../adapter/elevator'

export function setupPagination(
	host: HTMLElement,
	ctrl: IPagination | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IPagination, TPaginationCollectionFacade> {
	const adapter = createWebcAdapterContext(host, PaginationDescriptor(), { ctrl, props })
	const owner = useAdapter(adapter, host, onUpdate)

	const collectionAdapter = createWebcAdapterContext(
		host,
		PaginationCollectionDescriptor(),
		{ props, options: { owner: adapter.instance, engine: props['engine'] } },
		{ bundle: adapter.bundle },
	).use(TCollectionExtension, { elevator: createWebcElevator(host) })

	return joinBindings(owner, useCollectionAdapter(collectionAdapter, adapter, host, onUpdate))
}
