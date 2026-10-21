/**
 * useSetupMenuRadioItem — setup-слой переключателя меню (аналог setup.component.ts во Vue).
 *
 * Два контекста одной сборкой, как у флажка: собственный
 * (`MenuRadioItemDescriptor` — текст, значение и группа переключателя) и
 * фасада (`MenuCollectionRadioItemDescriptor` — вход в коллекцию меню и
 * отметка: она — выбор коллекции). Группу — ближайшую `Menu.RadioGroup` —
 * переключатель берёт проводкой при сборке (`TMenuRadioItemExtension`), до
 * входа в коллекцию. Лифт у обоих расширений один: они читают слой, который
 * переключатель увидел на рендере.
 *
 * `context` отдаётся разметке явно: нажатие — метод item-адаптера `menu`.
 */

import {
	MenuCollectionRadioItemDescriptor,
	MenuRadioItemDescriptor,
	TCollectionItemExtension,
	TMenuRadioItemExtension,
} from '@soldy-ui/setup'
import { useAdapter, useAdapterContext, useCollectionAdapter } from '../../../adapter'
import type { MenuRadioItemProps } from './base.component'

export function useSetupMenuRadioItem(props: MenuRadioItemProps) {
	const {
		contexts: [adapter, item],
	} = useAdapterContext((create, elevator) => {
		const adapter = create(MenuRadioItemDescriptor(), { ctrl: props.ctrl, props }).use(
			TMenuRadioItemExtension,
			{ elevator },
		)

		const item = create(
			MenuCollectionRadioItemDescriptor(),
			{ props },
			{ bundle: adapter.bundle },
		).use(TCollectionItemExtension, { item: adapter.instance, elevator })

		return [adapter, item] as const
	})

	const owner = useAdapter(adapter, props)
	const facade = useCollectionAdapter(item, props, owner.forwardProps)

	return {
		...owner,
		forwardProps: facade.forwardProps,
		state: { ...facade.state, ...owner.state },
		context: item.instance.context,
	}
}
