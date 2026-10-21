/**
 * setupTags — setup-слой Tags.
 *
 * Два контекста, как у Vue и Svelte: свой (`TagsDescriptor`) и фасада
 * коллекции (`TagsCollectionDescriptor`) на общем наборе. Оба собираются один
 * раз, при выполнении тела компонента; фасад делит набор тегов, и id
 * монтирования у него набора. У фасада одно расширение — сама коллекция
 * (`TCollectionExtension`): окна и перестановки у набора тегов нет, как у Vue.
 *
 * Расширение коллекции опускает движок и регистратор тегов в слой лифта набора
 * (`useElevator`), детям его отдаёт `Elevate` в разметке: тег, смонтированный
 * внутри, прочтёт их при своей сборке и войдёт в коллекцию набора.
 *
 * Состояние у контекстов своё, а разметка читает его одним видом
 * (`joinState`); атрибуты корня — то, что не съели ни набор, ни фасад.
 */

import { TCollectionExtension, TagsCollectionDescriptor, TagsDescriptor } from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	useElevator,
} from '../../adapter'
import type { TagsProps } from './base.component'

export function setupTags(props: TagsProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(TagsDescriptor(), { ctrl: props.ctrl, props })
	const owner = useAdapter(adapter, props)

	const collectionAdapter = createSolidAdapterContext(
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
