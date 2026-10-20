/**
 * useSetupPagination — setup-слой Pagination (аналог setup.component.ts во Vue).
 *
 * Два контекста одной сборкой: свой (`PaginationDescriptor`) и фасада
 * коллекции (`PaginationCollectionDescriptor`) на общем наборе. Фасад собран на
 * инстансе владельца, поэтому пересобираются и уничтожаются они вместе.
 *
 * Логики здесь нет: страницы окна, текущая, пропуски и связь текущей со
 * значением — расширение коллекции `pagination`, выключенность стрелок и
 * переход на соседнюю страницу — сама пагинация, имена стрелок — плагин имён.
 * Разметка раскладывает то, что они отдали.
 *
 * Движок снаружи — как у остальных коллекций. Состава и ключа сверки снаружи
 * нет — страницы окна кладёт в движок расширение пагинации. Расширение
 * коллекции опускает движок и регистратор страниц лифтом компонента; детям
 * его слой (`layer`) отдаёт `Elevate` в разметке.
 */

import {
	PaginationCollectionDescriptor,
	PaginationDescriptor,
	TCollectionExtension,
} from '@soldy-ui/setup'
import { useAdapter, useAdapterContext, useCollectionAdapter } from '../../adapter'
import type { PaginationProps } from './base.component'

export function useSetupPagination(props: PaginationProps) {
	const {
		contexts: [adapter, collectionAdapter],
		layer,
	} = useAdapterContext((create, elevator) => {
		const adapter = create(PaginationDescriptor(), { ctrl: props.ctrl, props })

		const collectionAdapter = create(
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

		return [adapter, collectionAdapter] as const
	})

	const owner = useAdapter(adapter, props)
	const collectionBinding = useCollectionAdapter(collectionAdapter, props, owner.forwardProps)

	return {
		...owner,
		forwardProps: collectionBinding.forwardProps,
		state: { ...owner.state, ...collectionBinding.state },
		layer,
	}
}
