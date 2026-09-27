/**
 * useSetupTabsItem — setup-слой таба (аналог setup.component.ts во Vue).
 *
 * Два контекста одной сборкой, как у элементов Vue: собственный
 * (`TabsItemDescriptor` — текст, значение, закрываемость) и фасада
 * (`TabsCollectionItemDescriptor` — активность, порядок, итог закрываемости).
 * Расширение элемента берёт через лифт движок и регистратор набора и отдаёт
 * фасаду контекст таба.
 *
 * В коллекцию таб входит, когда `useAdapterContext` принимает контексты при
 * коммите, а не на рендере. Пересобранный набор — это новый движок: таб
 * пересобирается вслед за ним, потому что сменилось прочитанное через лифт.
 *
 * `context` отдаётся разметке явно: активация и закрытие — методы
 * item-адаптеров.
 */

import {
	TCollectionItemExtension,
	TabsCollectionItemDescriptor,
	TabsItemDescriptor,
} from '@soldy-ui/setup'
import { useAdapter, useAdapterContext, useCollectionAdapter } from '../../../adapter'
import type { TabsItemProps } from './base.component'

export function useSetupTabsItem(props: TabsItemProps) {
	const {
		contexts: [adapter, item],
	} = useAdapterContext((create, elevator) => {
		const adapter = create(TabsItemDescriptor(), { ctrl: props.ctrl, props })

		const item = create(
			TabsCollectionItemDescriptor(),
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
