/**
 * setupPagination — setup-слой Pagination.
 *
 * Два контекста, как у Vue: свой (`PaginationDescriptor`) и фасада коллекции
 * (`PaginationCollectionDescriptor`) на общем наборе, с тем же id
 * монтирования.
 *
 * Логики здесь нет: страницы окна, текущая, пропуски и связь текущей со
 * значением — расширение коллекции `pagination`, выключенность стрелок и
 * переход на соседнюю страницу — сама пагинация, имена стрелок — плагин
 * имён. Разметка раскладывает то, что они отдали.
 *
 * Движок снаружи — как у остальных коллекций. Состава и ключа сверки снаружи
 * нет — страницы окна кладёт в движок расширение пагинации, и ключ у них —
 * ключ страницы. Движок и регистратор страниц расширение коллекции опускает
 * лифтом (`setContext`): страница, которую рисует пагинация, входит в её
 * коллекцию при своей инициализации.
 */

import {
	PaginationCollectionDescriptor,
	PaginationDescriptor,
	TCollectionExtension,
} from '@soldy-ui/setup'
import {
	SvelteElevatorFactory,
	createSvelteAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	type TRootReceiver,
} from '../../adapter'
import type { PaginationProps } from './base.component'

export function setupPagination(
	getProps: () => PaginationProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const props = getProps()
	const adapter = createSvelteAdapterContext(PaginationDescriptor(), {
		ctrl: props.ctrl,
		props,
		mountId,
	})
	const owner = useAdapter(adapter, getProps, receive)

	const collectionAdapter = createSvelteAdapterContext(
		PaginationCollectionDescriptor(),
		{
			props,
			mountId,
			// Готовая коллекция снаружи. Дали — фасад работает на ней и своей
			// не создаёт, лишь доложит недостающие расширения в неё же.
			// Не дали — соберёт свою. Развилка в `completeEngine`
			options: { owner: adapter.instance, engine: props.engine },
		},
		{ bundle: adapter.bundle },
	).use(TCollectionExtension, { elevator: SvelteElevatorFactory })

	const collectionBinding = useCollectionAdapter(
		collectionAdapter,
		getProps,
		() => owner.forwardProps,
	)

	return {
		ctrl: owner.ctrl,
		plugins: owner.plugins,
		attachElement: owner.attachElement,
		state: joinState(owner.state, collectionBinding.state),

		get forwardProps() {
			return collectionBinding.forwardProps
		},
	}
}
