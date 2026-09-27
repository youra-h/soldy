/**
 * useSetupListBoxItem — setup-слой элемента ListBox (аналог setup.component.ts во Vue).
 *
 * Два контекста одной сборкой, как у элементов Vue: собственный
 * (`ListBoxItemDescriptor` — текст и значение) и фасада
 * (`ListBoxCollectionItemDescriptor` — выбор, порядок, вид списка).
 * Расширение элемента берёт через лифт движок и регистратор списка и отдаёт
 * фасаду контекст элемента.
 *
 * В коллекцию элемент входит, когда `useAdapterContext` принимает контексты
 * при коммите, а не на рендере. Пересобранный список — это новый движок:
 * элемент пересобирается вслед за ним, потому что сменилось прочитанное через
 * лифт.
 *
 * `context` отдаётся разметке явно: выбор — метод item-адаптера.
 */

import {
	ListBoxCollectionItemDescriptor,
	ListBoxItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import { useAdapter, useAdapterContext, useCollectionAdapter } from '../../../adapter'
import type { ListBoxItemProps } from './base.component'

export function useSetupListBoxItem(props: ListBoxItemProps) {
	const {
		contexts: [adapter, item],
	} = useAdapterContext((create, elevator) => {
		const adapter = create(ListBoxItemDescriptor(), { ctrl: props.ctrl, props })

		const item = create(
			ListBoxCollectionItemDescriptor(),
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
