/**
 * setupListBoxItem — setup-слой элемента ListBox.
 *
 * Два контекста, как у элементов Vue: собственный (`ListBoxItemDescriptor` —
 * текст и значение) и фасада (`ListBoxCollectionItemDescriptor` — выбор,
 * порядок, вид списка). Расширение элемента берёт лифтом движок и регистратор
 * списка и отдаёт фасаду контекст элемента.
 *
 * В коллекцию элемент входит, когда контекст фасада принят, — при
 * инициализации компонента, и на сервере тоже: элемент разметки есть в
 * серверной разметке вместе с тем, что пишет ему коллекция.
 *
 * `context` отдаётся разметке явно: выбор — метод item-адаптера.
 */

import {
	ListBoxCollectionItemDescriptor,
	ListBoxItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import {
	createSvelteAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	useElevator,
	type TRootReceiver,
} from '../../../adapter'
import type { ListBoxItemProps } from './base.component'

export function setupListBoxItem(
	getProps: () => ListBoxItemProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const elevator = useElevator()
	const props = getProps()
	const adapter = createSvelteAdapterContext(ListBoxItemDescriptor(), {
		ctrl: props.ctrl,
		props,
		mountId,
	})
	const owner = useAdapter(adapter, getProps, receive)

	const item = createSvelteAdapterContext(
		ListBoxCollectionItemDescriptor(),
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
