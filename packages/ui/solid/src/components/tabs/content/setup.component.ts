/**
 * setupTabsContent — setup-слой панели таба.
 *
 * Два контекста, как у таба: собственный (`TabsContentDescriptor` — `value`
 * панели) и фасада (`TabsCollectionContentDescriptor` — активность связанного
 * таба). Панель сама о коллекции ничего не знает: таб по `value` находит
 * `TTabsContentBindingExtension` лифтом набора — из слоя, который панель
 * увидела при сборке (`useElevator`), — он же пишет сторону панели в её
 * `aria`.
 *
 * Табы, что стоят в документе раньше панели, к её сборке уже в коллекции — и
 * из данных, и из разметки: панель находит свой таб в сборке и рисуется с
 * первой отрисовки, на сервере тоже. Таб, вошедший позже, она находит, когда
 * контекст принят: тогда она подписана на `item:added`.
 */

import {
	TTabsContentBindingExtension,
	TabsCollectionContentDescriptor,
	TabsContentDescriptor,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	useElevator,
} from '../../../adapter'
import type { TabsContentProps } from './base.component'

export function setupTabsContent(props: TabsContentProps) {
	const { elevator } = useElevator()
	const adapter = createSolidAdapterContext(TabsContentDescriptor(), {
		ctrl: props.ctrl,
		props,
	})
	const owner = useAdapter(adapter, props)

	const content = createSolidAdapterContext(
		TabsCollectionContentDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TTabsContentBindingExtension, { content: adapter.instance, elevator })

	const facade = useCollectionAdapter(content, props, owner.forwardProps)

	return {
		ctrl: owner.ctrl,
		plugins: owner.plugins,
		ref: owner.ref,
		state: joinState(facade.state, owner.state),
		forwardProps: facade.forwardProps,
	}
}
