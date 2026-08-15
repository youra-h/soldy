// import { toRaw } from 'vue'
// import {
// 	createAdapterContext,
// 	TCollectionItemExtension,
// 	TCollectionItemContextExtension,
// 	TabItemDescriptor,
// 	TabsCollectionItemDescriptor,
// } from '@soldy/setup'
// import { useVue, useVueCollectionItem, VueElevatorFactory } from '../../../adapter'
// import { useIconImport, useSplitAttrs } from '../../../composables'
// import BaseTabItem from './tab-item.component'
// import type { TBaseComponentProps } from '../../../types'
// import { type ITabItemProps, type ITabItem } from '@soldy/core'

// export default {
// 	name: '_TabItem',
// 	inheritAttrs: false,
// 	extends: BaseTabItem,
// 	setup(props: TBaseComponentProps<ITabItemProps, ITabItem>, { emit }: any) {
// 		const adapter = createAdapterContext(TabItemDescriptor, {
// 			ctrl: props.ctrl ? toRaw(props.ctrl) : undefined,
// 			props,
// 		})
// 			.use(TCollectionItemExtension, { elevator: VueElevatorFactory })
// 			.use(TCollectionItemContextExtension, {
// 				elevator: VueElevatorFactory,
// 				descriptor: TabsCollectionItemDescriptor,
// 			})

// 		const itemExt = adapter.get(TCollectionItemContextExtension)

// 		return {
// 			...useVue<ITabItemProps, ITabItem>(adapter, props, emit),
// 			...useVueCollectionItem(itemExt, props, emit),
// 			// close() делегирует в TTabItemExtension через item-адаптер
// 			close: () => itemExt?.itemAdapters?.tabs?.close(),
// 			closeIconTag: useIconImport('close'),
// 			...useSplitAttrs(),
// 		}
// 	},
// }

import { toRaw, inject, watch } from 'vue'
import { createAdapterContext, TCollectionItemExtension, TabItemDescriptor } from '@soldy/setup'
import { useVue, VueElevatorFactory } from '../../../adapter'
import { useIconImport, useSplitAttrs } from '../../../composables'
import BaseTabItem from './tab-item.component'
import type { TBaseComponentProps } from '../../../types'
import { type ITabItemProps, type ITabItem } from '@soldy/core'

import { TItemContextRegistry } from '@soldy/core'
import { useSyncProps, useEventState } from '../../../composables'
import type { TTabsCollection, TTabsExtensions } from '../collection.types'
import { TABS_COLLECTION_KEY } from '../collection.types'

export default {
	name: '_TabItem',
	inheritAttrs: false,
	extends: BaseTabItem,
	setup(props: TBaseComponentProps<ITabItemProps, ITabItem>, { emit }: any) {
		const adapter = createAdapterContext(TabItemDescriptor, {
			ctrl: props.ctrl ? toRaw(props.ctrl) : undefined,
			props,
		})
		// .use(TCollectionItemExtension, { elevator: VueElevatorFactory })

		// Представим, что получили parent collection
		const collection = inject(TABS_COLLECTION_KEY) as TTabsCollection | undefined

		const instance = adapter.instance

		// Добавили item в collection
		if (!collection?.extensions?.unique.has(instance)) {
			collection?.extensions.plain.push(instance)
		}

		// Создаем реестр для доступа к item-адаптерам (кеширует через WeakMap)
		const registry = new TItemContextRegistry<ITabItem, TTabsExtensions>(collection!.getCore())

		// Получаем контекст для текущего item
		const context = registry.get(instance as ITabItem)

		watch(
			() => props.active,
			(newValue) => {
				context.adapters.activation.active = newValue
			}
		)

		return {
			...useVue<ITabItemProps, ITabItem>(adapter, props, emit),
			closeIconTag: useIconImport('close'),
			...useSplitAttrs(),

			context,

			...useSyncProps(context.adapters.activation.events, {
				active: {
					value: () => context.adapters.activation.active,
					triggers: ['change:active'],
				},
			}),
			...useSyncProps(context.adapters.order.events, {
				order: {
					value: () => context.adapters.order.order,
					triggers: ['change:order'],
				},
			}),
			...useSyncProps(context.adapters.tabs.events, {
				closable: {
					value: () => context.adapters.tabs.closable,
					triggers: ['change:closable'],
				},
			}),
			close: () => collection?.extensions.tabs.closeTab(instance as ITabItem),
		}
	},
}
