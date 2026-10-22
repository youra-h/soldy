/**
 * setupTabsContent — setup-слой панели таба.
 *
 * Два контекста, как у таба: собственный (`TabsContentDescriptor` — `value`
 * панели) и фасада (`TabsCollectionContentDescriptor` — активность связанного
 * таба). Панель сама о коллекции ничего не знает: таб по `value` находит
 * `TTabsContentBindingExtension` лифтом набора, он же пишет сторону панели в
 * её `aria`.
 *
 * Табы, что стоят в документе раньше панели, к её инициализации уже в
 * коллекции — и из данных, и из разметки: панель находит свой таб в сборке и
 * рисуется с первой отрисовки, на сервере тоже. Таб, вошедший позже, она
 * находит, когда контекст принят: тогда она подписана на `item:added`.
 */

import {
	TTabsContentBindingExtension,
	TabsCollectionContentDescriptor,
	TabsContentDescriptor,
} from '@soldy-ui/setup'
import {
	createSvelteAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	useElevator,
	type TRootReceiver,
} from '../../../adapter'
import type { TabsContentProps } from './base.component'

export function setupTabsContent(
	getProps: () => TabsContentProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const elevator = useElevator()
	const props = getProps()
	const adapter = createSvelteAdapterContext(TabsContentDescriptor(), {
		ctrl: props.ctrl,
		props,
		mountId,
	})
	const owner = useAdapter(adapter, getProps, receive)

	const content = createSvelteAdapterContext(
		TabsCollectionContentDescriptor(),
		{ props, mountId },
		{ bundle: adapter.bundle },
	).use(TTabsContentBindingExtension, { content: adapter.instance, elevator })

	const facade = useCollectionAdapter(content, getProps, () => owner.forwardProps)

	return {
		ctrl: owner.ctrl,
		plugins: owner.plugins,
		attachElement: owner.attachElement,
		state: joinState(facade.state, owner.state),

		get forwardProps() {
			return facade.forwardProps
		},
	}
}
