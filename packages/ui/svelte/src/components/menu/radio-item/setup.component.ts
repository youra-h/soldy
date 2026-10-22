/**
 * setupMenuRadioItem — setup-слой переключателя меню.
 *
 * Два контекста, как у флажка: собственный (`MenuRadioItemDescriptor` —
 * текст, значение и группа переключателя) и фасада
 * (`MenuCollectionRadioItemDescriptor` — вход в коллекцию меню и отметка: она
 * — выбор коллекции). Группу — ближайшую `Menu.RadioGroup` — переключатель
 * берёт проводкой при сборке (`TMenuRadioItemExtension`), до входа в
 * коллекцию: меню отмечает его по значению группы уже на входе.
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
	createSvelteAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	useElevator,
	type TRootReceiver,
} from '../../../adapter'
import type { MenuRadioItemProps } from './base.component'

export function setupMenuRadioItem(
	getProps: () => MenuRadioItemProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const elevator = useElevator()
	const props = getProps()
	const adapter = createSvelteAdapterContext(MenuRadioItemDescriptor(), {
		ctrl: props.ctrl,
		props,
		mountId,
	}).use(TMenuRadioItemExtension, { elevator })
	const owner = useAdapter(adapter, getProps, receive)

	const item = createSvelteAdapterContext(
		MenuCollectionRadioItemDescriptor(),
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
