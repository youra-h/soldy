/**
 * setupTagsItem — setup-слой тега.
 *
 * Два контекста, как у элементов Vue и Svelte: собственный
 * (`TagsItemDescriptor` — текст, значение, закрываемость, вариант) и фасада
 * (`TagsCollectionItemDescriptor` — выбор, порядок, итог закрываемости).
 * Расширение элемента берёт лифтом движок и регистратор набора — из слоя,
 * который тег увидел при сборке (`useElevator`), — и отдаёт фасаду контекст
 * тега.
 *
 * В коллекцию тег входит, когда контекст фасада принят, — при выполнении тела
 * компонента, и на сервере тоже.
 *
 * `context` отдаётся разметке явно: выбор и закрытие — методы item-адаптеров.
 */

import {
	TCollectionItemExtension,
	TagsCollectionItemDescriptor,
	TagsItemDescriptor,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	useElevator,
} from '../../../adapter'
import type { TagsItemProps } from './base.component'

export function setupTagsItem(props: TagsItemProps) {
	const { elevator } = useElevator()
	const adapter = createSolidAdapterContext(TagsItemDescriptor(), { ctrl: props.ctrl, props })
	const owner = useAdapter(adapter, props)

	const item = createSolidAdapterContext(
		TagsCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator })

	const facade = useCollectionAdapter(item, props, owner.forwardProps)

	return {
		ctrl: owner.ctrl,
		plugins: owner.plugins,
		ref: owner.ref,
		state: joinState(facade.state, owner.state),
		context: item.instance.context,
		forwardProps: facade.forwardProps,
	}
}
