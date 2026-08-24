import { toRaw } from 'vue'
import {
	createAdapterContext,
	TCollectionItemExtension,
	TCollectionItemContextExtension,
	TabItemDescriptor,
	TabsCollectionDescriptor,
} from '@soldy/setup'
import type { ITabItemProps, ITabItem, TTabsCollectionExtensions } from '@soldy/core'
import { useVue, useVueCollectionItem, VueElevatorFactory } from '../../../adapter'
import { useIconImport, useSplitAttrs } from '../../../composables'
import BaseTabItem from './tab-item.component'
import type { TBaseComponentProps } from '../../../types'

export default {
	name: '_TabItem',
	inheritAttrs: false,
	extends: BaseTabItem,
	setup(props: TBaseComponentProps<ITabItemProps, ITabItem>, { emit }: any) {
		const adapter = createAdapterContext(TabItemDescriptor, {
			ctrl: props.ctrl ? toRaw(props.ctrl) : undefined,
			props,
		})
			.use(TCollectionItemContextExtension, {
				descriptor: TabsCollectionDescriptor,
				elevator: VueElevatorFactory,
			})
			.use(TCollectionItemExtension, { elevator: VueElevatorFactory })

		const { context, ...itemRefs } = useVueCollectionItem<ITabItem, TTabsCollectionExtensions>(
			adapter,
		)

		return {
			...useVue<ITabItemProps, ITabItem>(adapter, props, emit),
			...itemRefs,
			context,
			closeIconTag: useIconImport('close'),
			...useSplitAttrs(),
		}
	},
}

// import { toRaw, inject, watch } from 'vue'
// import { createAdapterContext, TCollectionItemExtension, TabItemDescriptor } from '@soldy/setup'
// import { useVue, VueElevatorFactory } from '../../../adapter'
// import { useIconImport, useSplitAttrs } from '../../../composables'
// import BaseTabItem from './tab-item.component'
// import type { TBaseComponentProps } from '../../../types'
// import { type ITabItemProps, type ITabItem } from '@soldy/core'

// import { TItemContextRegistry } from '@soldy/core'
// import { useSyncProps, useEventState } from '../../../composables'
// import type { TTabsCollection, TTabsCollectionExtensions } from '@soldy/core'
// import { TABS_COLLECTION_KEY } from '../collection.types'

// export default {
// 	name: '_TabItem',
// 	inheritAttrs: false,
// 	extends: BaseTabItem,
// 	setup(props: TBaseComponentProps<ITabItemProps, ITabItem>, { emit }: any) {
// 		const adapter = createAdapterContext(TabItemDescriptor, {
// 			ctrl: props.ctrl ? toRaw(props.ctrl) : undefined,
// 			props,
// 		})
// 		// .use(TCollectionItemExtension, { elevator: VueElevatorFactory })

// 		// Представим, что получили parent collection
// 		const collection = inject(TABS_COLLECTION_KEY) as TTabsCollection | undefined

// 		const instance = adapter.instance

// 		// Добавили item в collection
// 		if (!collection?.extensions?.unique.has(instance)) {
// 			collection?.extensions.plain.push(instance)
// 		}

// 		// Создаем реестр для доступа к item-адаптерам (кеширует через WeakMap)
// 		const registry = new TItemContextRegistry<ITabItem, TTabsCollectionExtensions>(
// 			collection!.getCore(),
// 		)

// 		// Получаем контекст для текущего item
// 		const context = registry.get(instance as ITabItem)

// 		watch(
// 			() => props.active,
// 			(newValue) => {
// 				if (typeof newValue === 'boolean') {
// 					context.adapters.activation.active = newValue
// 				}
// 			},
// 			{ immediate: true },
// 		)

// 		return {
// 			...useVue<ITabItemProps, ITabItem>(adapter, props, emit),
// 			closeIconTag: useIconImport('close'),
// 			...useSplitAttrs(),

// 			context,

// 			...useSyncProps(context.adapters.activation.events, {
// 				active: {
// 					value: () => context.adapters.activation.active,
// 					triggers: ['change:active'],
// 				},
// 			}),
// 			...useSyncProps(context.adapters.order.events, {
// 				_order: {
// 					value: () => context.adapters.order.order,
// 					triggers: ['change:order'],
// 				},
// 			}),
// 			...useSyncProps(context.adapters.tabs.events, {
// 				_closable: {
// 					value: () => context.adapters.tabs.closable,
// 					triggers: ['change:closable'],
// 				},
// 			}),
// 			close: () => collection?.extensions.tabs.closeTab(instance as ITabItem),
// 		}
// 	},
// }
