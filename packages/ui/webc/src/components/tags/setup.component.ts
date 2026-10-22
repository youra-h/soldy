/**
 * setupTags — setup-слой Tags.
 *
 * Два контекста, как у Vue: свой (`TagsDescriptor` — закрываемость, вид,
 * переполнение, клавиатура) и фасада коллекции (`TagsCollectionDescriptor` —
 * режим выбора и сам выбор) на общем наборе, одной связкой.
 *
 * Расширение коллекции опускает движок и регистратор тегов лифтом — хосту
 * набора: теги, что стоят ниже, находят их вверх по документу и входят в его
 * коллекцию.
 *
 * `engine` — готовая коллекция снаружи, свойство элемента (`el.engine`): фасад
 * работает на ней, а без неё собирает свою (`completeEngine`). Так теги в поле
 * Select получают связку «опция ⇄ тег»: деталь Tags над экземпляром и
 * коллекцией, которые держит Select (`tags`, `tags_engine`).
 */

import { TCollectionExtension, TagsCollectionDescriptor, TagsDescriptor } from '@soldy-ui/setup'
import type { ITags, TTagsCollectionFacade } from '@soldy-ui/core'
import {
	createWebcAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'
import { createWebcElevator } from '../../adapter/elevator'

export function setupTags(
	host: HTMLElement,
	ctrl: ITags | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<ITags, TTagsCollectionFacade> {
	const adapter = createWebcAdapterContext(host, TagsDescriptor(), { ctrl, props })
	const owner = useAdapter(adapter, host, onUpdate)

	const collectionAdapter = createWebcAdapterContext(
		host,
		TagsCollectionDescriptor(),
		{ props, options: { owner: adapter.instance, engine: props['engine'] } },
		{ bundle: adapter.bundle },
	).use(TCollectionExtension, { elevator: createWebcElevator(host) })

	return joinBindings(owner, useCollectionAdapter(collectionAdapter, host, onUpdate))
}
