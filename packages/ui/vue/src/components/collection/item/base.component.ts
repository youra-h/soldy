import { type ICollectionItem, type ICollectionItemProps } from '@soldy/core'
import { useSyncProps } from '../../../composables/useSyncProps'
import type { Ref } from 'vue'
import type { TEmits, TProps, ISyncComponentOptions } from '../../../types'

export const emitsCollectionItem: TEmits = ['free', 'change:order'] as const

export const propsCollectionItem: TProps = {}

export default {
	name: 'BaseCollectionItem',
	emits: emitsCollectionItem,
	props: propsCollectionItem,
}

export interface ICollectionItemState<T extends ICollectionItem = ICollectionItem> {
	order: Ref<number | undefined>
}

/**
 * Синхронизация props и событий для CollectionItem
 */
export function syncCollectionItem(
	options: ISyncComponentOptions<ICollectionItemProps, ICollectionItem>,
): ICollectionItemState {
	const { instance, emit, plugins } = options

	// Родитель-ребёнок связь теперь через IContextElevator в useAdapter
	// (useInjectCollectionItem + useInjectCollectionItemPlugins удалены)

	// Пробрасываем события core-инстанса наружу (Vue events)
	instance.events.on('free', (item: ICollectionItem) => {
		// Скрываем компонент через Vue proxy — иначе реактивность не сработает,
		// т.к. free() вызывается на raw-объекте, а не через proxy
		if ('rendered' in instance) {
			;(instance as ICollectionItem & { rendered: boolean }).rendered = false
		}
		emit?.('free', item)
	})

	instance.events.on('change:order', (value: number) => {
		emit?.('change:order', value)
	})

	return {
		...useSyncProps(instance.events, {
			order: () => instance.order,
		}),
	}
}
