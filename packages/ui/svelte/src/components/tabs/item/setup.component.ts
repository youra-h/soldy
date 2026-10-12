/**
 * setupTabsItem — setup-слой таба.
 *
 * Два контекста, как у элементов Vue: собственный (`TabsItemDescriptor` —
 * текст, значение, закрываемость) и фасада (`TabsCollectionItemDescriptor` —
 * активность, порядок, итог закрываемости). Расширение элемента берёт лифтом
 * движок и регистратор набора и отдаёт фасаду контекст таба.
 *
 * В коллекцию таб входит, когда контекст фасада принят, — при инициализации
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
	SvelteElevatorFactory,
	createSvelteAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TabsItemProps } from './base.component'

export function setupTabsItem(getProps: () => TabsItemProps, mountId: string) {
	const props = getProps()
	const adapter = createSvelteAdapterContext(TabsItemDescriptor(), {
		ctrl: props.ctrl,
		props,
		mountId,
	})
	const owner = useAdapter(adapter, getProps)

	const item = createSvelteAdapterContext(
		TabsCollectionItemDescriptor(),
		{ props, mountId },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator: SvelteElevatorFactory })

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
