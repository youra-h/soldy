import {
	TCollectionItemExtension,
	TagsCollectionItemDescriptor,
	TagsItemDescriptor,
} from '@soldy-ui/setup'
import type { ITagsItem, TTagsItemCollectionFacade } from '@soldy-ui/core'
import {
	AngularElevatorFactory,
	createAngularAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding } from '../../../adapter'

/**
 * setupTagsItem — setup-слой тега.
 *
 * Два контекста, как у элементов Vue и Svelte: собственный
 * (`TagsItemDescriptor` — текст, значение, свой вариант, закрываемость) и
 * фасада (`TagsCollectionItemDescriptor` — выбор, порядок, итог
 * закрываемости). Расширение элемента берёт лифтом из слоя набора движок и
 * регистратор и отдаёт фасаду контекст тега.
 *
 * В коллекцию тег входит, когда контекст фасада принят, — в `ngOnInit`, и на
 * сервере тоже: тег разметки есть в серверной разметке вместе с тем, что
 * пишет ему коллекция.
 */
export function setupTagsItem(
	ctrl: ITagsItem | undefined,
	props: object,
): TBinding<ITagsItem, TTagsItemCollectionFacade> {
	const adapter = createAngularAdapterContext(TagsItemDescriptor(), { ctrl, props })
	const owner = useAdapter(adapter)

	const item = createAngularAdapterContext(
		TagsCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator: AngularElevatorFactory })

	return joinBindings(owner, useCollectionAdapter(item))
}
