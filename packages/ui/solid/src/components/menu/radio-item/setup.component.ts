/**
 * setupMenuRadioItem — setup-слой переключателя меню.
 *
 * Два контекста, как у флажка: собственный (`MenuRadioItemDescriptor` —
 * текст, значение и группа переключателя) и фасада
 * (`MenuCollectionRadioItemDescriptor` — вход в коллекцию меню и отметка: она
 * — выбор коллекции). Группу — ближайшую `Menu.RadioGroup` — переключатель
 * берёт проводкой при сборке (`TMenuRadioItemExtension`), до входа в
 * коллекцию. Лифт у обоих расширений один: они читают слой, который
 * переключатель увидел при сборке (`useElevator`).
 *
 * `context` отдаётся разметке явно: нажатие — метод item-адаптера `menu`.
 */

import {
	MenuCollectionRadioItemDescriptor,
	MenuRadioItemDescriptor,
	TCollectionItemExtension,
	TMenuRadioItemExtension,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	useElevator,
} from '../../../adapter'
import type { MenuRadioItemProps } from './base.component'

export function setupMenuRadioItem(props: MenuRadioItemProps) {
	const { elevator } = useElevator()
	const adapter = createSolidAdapterContext(MenuRadioItemDescriptor(), {
		ctrl: props.ctrl,
		props,
	}).use(TMenuRadioItemExtension, { elevator })
	const owner = useAdapter(adapter, props)

	const item = createSolidAdapterContext(
		MenuCollectionRadioItemDescriptor(),
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
