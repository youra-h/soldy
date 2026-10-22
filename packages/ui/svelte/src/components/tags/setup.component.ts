/**
 * setupTags — setup-слой Tags.
 *
 * Два контекста, как у Vue: свой (`TagsDescriptor`) и фасада коллекции
 * (`TagsCollectionDescriptor`) на общем наборе, с тем же id монтирования.
 * У фасада одно расширение — сама коллекция (`TCollectionExtension`): окна и
 * перестановки у набора тегов нет, как у Vue.
 *
 * Расширение коллекции опускает движок и регистратор тегов лифтом
 * (`setContext`): тег, смонтированный внутри, прочтёт их при своей
 * инициализации и войдёт в коллекцию набора.
 *
 * Состояние у контекстов своё, а разметка читает его одним видом
 * (`joinState`); атрибуты корня — то, что не съели ни набор, ни фасад.
 */

import { TCollectionExtension, TagsCollectionDescriptor, TagsDescriptor } from '@soldy-ui/setup'
import {
	createSvelteAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	useElevator,
	type TRootReceiver,
} from '../../adapter'
import type { TagsProps } from './base.component'

export function setupTags(getProps: () => TagsProps, mountId: string, receive: TRootReceiver) {
	const elevator = useElevator()
	const props = getProps()
	const adapter = createSvelteAdapterContext(TagsDescriptor(), {
		ctrl: props.ctrl,
		props,
		mountId,
	})
	const owner = useAdapter(adapter, getProps, receive)

	const collectionAdapter = createSvelteAdapterContext(
		TagsCollectionDescriptor(),
		{
			props,
			mountId,
			// Готовая коллекция снаружи. Дали — фасад работает на ней и своей
			// не создаёт, лишь доложит недостающие расширения в неё же.
			// Не дали — соберёт свою. Развилка в `completeEngine`
			options: { owner: adapter.instance, engine: props.engine },
		},
		{ bundle: adapter.bundle },
	).use(TCollectionExtension, { elevator })

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
