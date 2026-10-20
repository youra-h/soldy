/**
 * setupPagination — setup-слой Pagination.
 *
 * Два контекста, как у Vue: свой (`PaginationDescriptor`) и фасада коллекции
 * (`PaginationCollectionDescriptor`) на общем наборе. Оба собираются один
 * раз, при выполнении тела компонента; фасад делит набор пагинации, и id
 * монтирования у него пагинации.
 *
 * Логики здесь нет: страницы окна, текущая, пропуски и связь текущей со
 * значением — расширение коллекции `pagination`, выключенность стрелок и
 * переход на соседнюю страницу — сама пагинация, имена стрелок — плагин имён,
 * цифры номеров — плагин языка. Разметка раскладывает то, что они отдали.
 *
 * Движок снаружи — как у остальных коллекций. Состава и ключа сверки снаружи
 * нет — страницы окна кладёт в движок расширение пагинации, и ключ у них —
 * ключ страницы. Расширение коллекции опускает движок и регистратор страниц в
 * слой лифта пагинации (`useElevator`), детям его отдаёт `Elevate` в разметке:
 * страница, смонтированная внутри, привязывается к своей записи коллекции.
 */

import {
	PaginationCollectionDescriptor,
	PaginationDescriptor,
	TCollectionExtension,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	useElevator,
} from '../../adapter'
import type { PaginationProps } from './base.component'

export function setupPagination(props: PaginationProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(PaginationDescriptor(), {
		ctrl: props.ctrl,
		props,
	})
	const owner = useAdapter(adapter, props)

	const collectionAdapter = createSolidAdapterContext(
		PaginationCollectionDescriptor(),
		{
			props,
			// Готовая коллекция снаружи. Дали — фасад работает на ней и своей
			// не создаёт, лишь доложит недостающие расширения в неё же.
			// Не дали — соберёт свою. Развилка в `completeEngine`
			options: { owner: adapter.instance, engine: props.engine },
		},
		{ bundle: adapter.bundle },
	).use(TCollectionExtension, { elevator })

	const collectionBinding = useCollectionAdapter(collectionAdapter, props, owner.forwardProps)

	return {
		ctrl: owner.ctrl,
		plugins: owner.plugins,
		ref: owner.ref,
		state: joinState(owner.state, collectionBinding.state),
		forwardProps: collectionBinding.forwardProps,
		layer,
	}
}
