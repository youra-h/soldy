/**
 * setupTagsItem — setup-слой тега.
 *
 * Два контекста, как у элементов Vue: собственный (`TagsItemDescriptor` —
 * текст, значение, закрываемость, вариант) и фасада
 * (`TagsCollectionItemDescriptor` — выбор, порядок, итог закрываемости).
 * Расширение элемента берёт лифтом движок и регистратор набора и отдаёт фасаду
 * контекст тега.
 *
 * В коллекцию тег входит, когда контекст фасада принят, — при инициализации
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
	createSvelteAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	useElevator,
	type TRootReceiver,
} from '../../../adapter'
import type { TagsItemProps } from './base.component'

export function setupTagsItem(
	getProps: () => TagsItemProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const elevator = useElevator()
	const props = getProps()
	const adapter = createSvelteAdapterContext(TagsItemDescriptor(), {
		ctrl: props.ctrl,
		props,
		mountId,
	})
	const owner = useAdapter(adapter, getProps, receive)

	const item = createSvelteAdapterContext(
		TagsCollectionItemDescriptor(),
		{ props, mountId },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator })

	const facade = useCollectionAdapter(item, getProps, () => owner.forwardProps)

	return {
		ctrl: owner.ctrl,
		plugins: owner.plugins,
		attachElement: owner.attachElement,
		state: joinState(facade.state, owner.state),
		context: item.instance.context,

		get forwardProps() {
			return facade.forwardProps
		},
	}
}
