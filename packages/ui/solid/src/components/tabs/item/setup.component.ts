/**
 * setupTabsItem — setup-слой таба.
 *
 * Два контекста, как у элементов Vue и Svelte: собственный
 * (`TabsItemDescriptor` — текст, значение, закрываемость) и фасада
 * (`TabsCollectionItemDescriptor` — активность, порядок, итог закрываемости).
 * Расширение элемента берёт лифтом движок и регистратор набора — из слоя,
 * который таб увидел при сборке (`useElevator`), — и отдаёт фасаду контекст
 * таба.
 *
 * В коллекцию таб входит, когда контекст фасада принят, — при выполнении тела
 * компонента, и на сервере тоже.
 *
 * `context` отдаётся разметке явно: активация и закрытие — методы
 * item-адаптеров.
 */

import {
	TCollectionItemExtension,
	TabsCollectionItemDescriptor,
	TabsItemDescriptor,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	useElevator,
} from '../../../adapter'
import type { TabsItemProps } from './base.component'

export function setupTabsItem(props: TabsItemProps) {
	const { elevator } = useElevator()
	const adapter = createSolidAdapterContext(TabsItemDescriptor(), { ctrl: props.ctrl, props })
	const owner = useAdapter(adapter, props)

	const item = createSolidAdapterContext(
		TabsCollectionItemDescriptor(),
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
