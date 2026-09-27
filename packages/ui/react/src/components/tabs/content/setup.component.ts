/**
 * useSetupTabsContent — setup-слой панели таба (аналог setup.component.ts во Vue).
 *
 * Два контекста одной сборкой, как у таба: собственный (`TabsContentDescriptor`
 * — `value` панели) и фасада (`TabsCollectionContentDescriptor` — активность
 * связанного таба). Панель сама о коллекции ничего не знает: таб по `value`
 * находит `TTabsContentBindingExtension` через лифт компонента, он же пишет
 * сторону панели в её `aria`.
 *
 * Таб из данных связка находит уже в сборке, таб разметки — когда
 * `useAdapterContext` принимает контексты при коммите: к этому времени табы,
 * что стоят в документе раньше панели, в коллекции уже есть.
 */

import {
	TTabsContentBindingExtension,
	TabsCollectionContentDescriptor,
	TabsContentDescriptor,
} from '@soldy-ui/setup'
import { useAdapter, useAdapterContext, useCollectionAdapter } from '../../../adapter'
import type { TabsContentProps } from './base.component'

export function useSetupTabsContent(props: TabsContentProps) {
	const {
		contexts: [adapter, content],
	} = useAdapterContext((create, elevator) => {
		const adapter = create(TabsContentDescriptor(), { ctrl: props.ctrl, props })

		const content = create(
			TabsCollectionContentDescriptor(),
			{ props },
			{ bundle: adapter.bundle },
		).use(TTabsContentBindingExtension, { content: adapter.instance, elevator })

		return [adapter, content] as const
	})

	const owner = useAdapter(adapter, props)
	const facade = useCollectionAdapter(content, props, owner.forwardProps)

	return {
		...owner,
		forwardProps: facade.forwardProps,
		state: { ...facade.state, ...owner.state },
	}
}
