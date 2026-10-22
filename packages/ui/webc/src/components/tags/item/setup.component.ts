/**
 * setupTagsItem — setup-слой тега.
 *
 * Два контекста, как у элементов Vue и ListBox: собственный
 * (`TagsItemDescriptor` — текст, значение, своя закрываемость, набор крестика)
 * и фасада (`TagsCollectionItemDescriptor` — выбор, порядок, итог
 * закрываемости), одной связкой. Расширение элемента берёт лифтом движок и
 * регистратор набора — ближайшего выше по документу, у тегов поля Select —
 * набора в его поле — и отдаёт фасаду контекст тега. Порядок связок — как у
 * Vue: фасад первым, и в коллекцию тег входит, когда его контекст принят, — при
 * подключении элемента.
 */

import {
	TCollectionItemExtension,
	TagsCollectionItemDescriptor,
	TagsItemDescriptor,
} from '@soldy-ui/setup'
import type { ITagsItem, TTagsItemCollectionFacade } from '@soldy-ui/core'
import {
	createWebcAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding, TUpdateListener } from '../../../adapter'
import { createWebcElevator } from '../../../adapter/elevator'

export function setupTagsItem(
	host: HTMLElement,
	ctrl: ITagsItem | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<ITagsItem, TTagsItemCollectionFacade> {
	const adapter = createWebcAdapterContext(host, TagsItemDescriptor(), { ctrl, props })

	const itemAdapter = createWebcAdapterContext(
		host,
		TagsCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, {
		item: adapter.instance,
		elevator: createWebcElevator(host),
	})

	const item = useCollectionAdapter(itemAdapter, host, onUpdate)
	const owner = useAdapter(adapter, host, onUpdate)

	return joinBindings(owner, item)
}
