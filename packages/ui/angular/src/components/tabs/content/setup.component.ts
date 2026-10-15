import {
	TTabsContentBindingExtension,
	TabsCollectionContentDescriptor,
	TabsContentDescriptor,
} from '@soldy-ui/setup'
import type { ITabsContent, TTabsContentCollectionFacade } from '@soldy-ui/core'
import {
	AngularElevatorFactory,
	createAngularAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding } from '../../../adapter'

/**
 * setupTabsContent — setup-слой панели таба.
 *
 * Два контекста, как у таба: собственный (`TabsContentDescriptor` — `value`
 * панели) и фасада (`TabsCollectionContentDescriptor` — активность связанного
 * таба). Панель сама о коллекции ничего не знает: таб по `value` находит
 * `TTabsContentBindingExtension` лифтом из слоя набора, он же пишет сторону
 * панели в её `aria`.
 *
 * Табы, что стоят в разметке раньше панели, к её сборке уже в коллекции — и
 * из данных, и из разметки: `ngOnInit` Angular зовёт в порядке шаблона.
 * Панель находит свой таб в сборке и рисуется с первой отрисовки, на сервере
 * тоже. Таб, вошедший позже, она находит, когда контекст принят: тогда она
 * подписана на `item:added`.
 */
export function setupTabsContent(
	ctrl: ITabsContent | undefined,
	props: object,
): TBinding<ITabsContent, TTabsContentCollectionFacade> {
	const adapter = createAngularAdapterContext(TabsContentDescriptor(), { ctrl, props })
	const owner = useAdapter(adapter)

	const content = createAngularAdapterContext(
		TabsCollectionContentDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TTabsContentBindingExtension, {
		content: adapter.instance,
		elevator: AngularElevatorFactory,
	})

	return joinBindings(owner, useCollectionAdapter(content))
}
