/**
 * useSetupTags — setup-слой Tags (аналог setup.component.ts во Vue).
 *
 * Два контекста одной сборкой, как у ListBox: свой (`TagsDescriptor`) и фасада
 * коллекции (`TagsCollectionDescriptor`) на общем наборе. Фасад собран на
 * инстансе владельца, поэтому пересобираются и уничтожаются они вместе. У
 * фасада одно расширение — сама коллекция (`TCollectionExtension`): окна и
 * перестановки у набора тегов нет, как у Vue.
 *
 * Расширение коллекции опускает движок и регистратор тегов лифтом
 * компонента; детям его слой (`layer`) отдаёт `Elevate` в разметке: тег,
 * смонтированный внутри, прочтёт их при своей сборке и при коммите войдёт в
 * коллекцию набора.
 */

import { TCollectionExtension, TagsCollectionDescriptor, TagsDescriptor } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext, useCollectionAdapter } from '../../adapter'
import type { TagsProps } from './base.component'

export function useSetupTags(props: TagsProps) {
	const {
		contexts: [adapter, collectionAdapter],
		layer,
	} = useAdapterContext((create, elevator) => {
		const adapter = create(TagsDescriptor(), { ctrl: props.ctrl, props })

		const collectionAdapter = create(
			TagsCollectionDescriptor(),
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
