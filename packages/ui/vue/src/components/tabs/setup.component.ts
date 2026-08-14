// import { toRaw } from 'vue'
// import {
// 	createAdapterContext,
// 	createCollectionContext,
// 	TCollectionItemElevatorExtension,
// 	TabsDescriptor,
// 	TabsCollectionDescriptor,
// } from '@soldy/setup'
// import { useVue, useVueCollection, VueElevatorFactory } from '../../adapter'
// import BaseTabs from './base.component'
// import type { TBaseComponentProps } from '../../types'
// import { type ITabsProps, type ITabs } from '@soldy/core'

// export default {
// 	name: '_Tabs',
// 	extends: BaseTabs,
// 	setup(props: TBaseComponentProps<ITabsProps, ITabs>, { emit }: any) {
// 		const adapter = createAdapterContext(TabsDescriptor, {
// 			ctrl: props.ctrl ? toRaw(props.ctrl) : undefined,
// 			props,
// 		})

// 		const colCtx = createCollectionContext(TabsCollectionDescriptor, adapter.instance).use(
// 			TCollectionItemElevatorExtension,
// 			{ elevator: VueElevatorFactory },
// 		)

// 		return {
// 			...useVue<ITabsProps, ITabs>(adapter, props, emit),
// 			...useVueCollection(colCtx, props, emit),
// 		}
// 	},
// }

import { toRaw, provide, watch } from 'vue'
import {
	createAdapterContext,
	TCollectionExtension,
	TDragAndDropCollectionExtension,
	TabsDescriptor,
} from '@soldy/setup'
import { useVue, VueElevatorFactory } from '../../adapter'
import BaseTabs from './base.component'
import type { TBaseComponentProps } from '../../types'
import { type ITabsProps, type ITabs, type ITabItem, TTabItem } from '@soldy/core'
import {
	TTabs,
	TCollection,
	TPlainExtension,
	TBatchExtension,
	TFactoryExtension,
	TActivationExtension,
	TOrderExtension,
	TTabsExtension,
} from '@soldy/core'
import type { TTabsCollection } from './collection.types'
import { TABS_COLLECTION_KEY } from './collection.types'
import { useSyncProps } from '../../composables'

export default {
	name: '_Tabs',
	extends: BaseTabs,
	setup(props: TBaseComponentProps<ITabsProps, ITabs>, { emit }: any) {
		const adapter = createAdapterContext(TabsDescriptor, {
			ctrl: props.ctrl ? toRaw(props.ctrl) : undefined,
			props,
		})

		// Можно полуить Instance tabs через adapter.instance, если нужно вызвать методы напрямую
		const instance = adapter.instance

		// .use(TCollectionExtension, { elevator: VueElevatorFactory })
		// .use(TDragAndDropCollectionExtension, { elevator: VueElevatorFactory })

		const collection: TTabsCollection = new TCollection({
			extensions: {
				factory: new TFactoryExtension<ITabItem>({ itemCtor: TTabItem }),
				order: new TOrderExtension<ITabItem>(),
				plain: new TPlainExtension<ITabItem>(),
				batch: new TBatchExtension<ITabItem>(),
				activation: new TActivationExtension<ITabItem>(),
				tabs: new TTabsExtension({ owner: instance }),
			},
		})

		provide(TABS_COLLECTION_KEY, collection)

		watch(
			() => props.items,
			(newItems) => {
				if (newItems) {
					collection.extensions.batch.update(newItems)
				}
			},
			{ immediate: true },
		)

		// Явно прокидываем дженерик ITabs во второй параметр useVue (или он выведется сам, если адаптер типизирован)
		return {
			...useVue<ITabsProps, ITabs>(adapter, props, emit),
			...useSyncProps(collection.engine.events, {
				items: {
					value: () => {
						console.log('collection.engine.items', collection.engine)
						return collection.engine
					},
					triggers: ['change:items'],
				},
			}),
			...useSyncProps(collection.extensions.activation.events, {
				activeItem: {
					value: () => collection.extensions.activation.activeItem,
					triggers: ['change:activation'],
				},
			}),
		}
	},
}
