/**
 * useSetupTabs — setup-слой Tabs (аналог setup.component.ts во Vue).
 *
 * Два контекста одной сборкой: свой (`TabsDescriptor`) и фасада коллекции
 * (`TabsCollectionDescriptor`) на общем наборе. Фасад собран на инстансе
 * владельца, поэтому пересобираются и уничтожаются они вместе.
 *
 * Расширения коллекции опускают движок и регистратор табов лифтом компонента;
 * детям его слой (`layer`) отдаёт `Elevate` в разметке — и табам, и панелям.
 */

import {
	TCollectionExtension,
	TDragAndDropCollectionExtension,
	TabsCollectionDescriptor,
	TabsDescriptor,
} from '@soldy-ui/setup'
import { useAdapter, useAdapterContext, useCollectionAdapter } from '../../adapter'
import type { TabsProps } from './base.component'

export function useSetupTabs(props: TabsProps) {
	const {
		contexts: [adapter, collectionAdapter],
		layer,
	} = useAdapterContext((create, elevator) => {
		const adapter = create(TabsDescriptor(), { ctrl: props.ctrl, props })

		const collectionAdapter = create(
			TabsCollectionDescriptor(),
			{
				props,
				// Готовая коллекция снаружи. Дали — фасад работает на ней и своей
				// не создаёт, лишь доложит недостающие расширения в неё же.
				// Не дали — соберёт свою. Развилка в `completeEngine`
				options: { owner: adapter.instance, engine: props.engine },
			},
			{ bundle: adapter.bundle },
		)
			.use(TCollectionExtension, { elevator })
			.use(TDragAndDropCollectionExtension, { elevator })

		return [adapter, collectionAdapter] as const
	})

	const owner = useAdapter(adapter, props)
	const collectionBinding = useCollectionAdapter(collectionAdapter, props, owner.forwardProps)

	return {
		...owner,
		forwardProps: collectionBinding.forwardProps,
		state: { ...owner.state, ...collectionBinding.state },
		layer,
	}
}
