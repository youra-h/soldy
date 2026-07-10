import type { PropType, Ref } from 'vue'
import { watch } from 'vue'
import {
	type ICollection,
	type ICollectionSource,
	type ICollectionProps,
	type ICollectionItem,
	type TCollectionItemSource,
	type TCollectionEvents,
} from '@soldy/core'
import { TCollectionItemPlugins, TDragPlugin } from '@soldy/plugins'
import { useProvideCollection } from '../../composables/useProvideCollection'
import { useProvideCollectionPlugins } from '../../composables/useProvideCollectionPlugins'
import { useInjectDragContext } from '../../composables/useDragContext'
import type { TEmits, TProps, ISyncComponentOptions } from '../../types'
import { useSyncProps } from '../../composables/useSyncProps'

export const emitsCollection: TEmits = [
	'changed',
	'change:items',
	'update:items',
	'change:count',
	'reset',
	'item:added',
	'item:beforeDelete',
	'item:deleted',
	'item:afterDelete',
	'item:beforeMove',
	'item:moved',
	'item:afterMove',
] as const

export const propsCollection: TProps = {
	items: {
		type: Array as PropType<TCollectionItemSource<ICollectionItem>[]>,
		default: undefined,
	},
	trackBy: {
		type: Function as PropType<(item: any) => unknown>,
		default: undefined,
	},
}

export default {
	name: 'BaseCollection',
	emits: emitsCollection,
	props: propsCollection,
}

export interface ICollectionState<TItem = any> {
	items: Ref<TItem[]>
	count: Ref<number>
}

/**
 * Синхронизация props и событий для Collection
 */
export function syncCollection<TItem extends ICollectionItem = ICollectionItem>(
	options: ISyncComponentOptions<
		ICollectionSource<TItem>,
		ICollection<ICollectionProps, TCollectionEvents, TItem>
	>,
): ICollectionState<TItem> {
	const { ctrl, emit, props, plugins } = options

	useProvideCollection(ctrl)

	const collectionItemPlugins = plugins.get(TCollectionItemPlugins)

	if (collectionItemPlugins) {
		useProvideCollectionPlugins((uid, bundle) => {
			collectionItemPlugins?.register(uid, bundle)
		})
	}

	// Если компонент находится внутри контекста DragAndDrop, активируем плагин для этой коллекции
	if (useInjectDragContext()) {
		plugins.get(TDragPlugin)?.activate(ctrl)
	}

	watch(
		() => props.items,
		(items, oldItems) => {
			if (items !== undefined && items !== oldItems) {
				if (props.trackBy) {
					ctrl.patchItems(items, props.trackBy)
				} else {
					ctrl.setItems(items)
				}
			}
		},
		{ immediate: true, deep: true },
	)

	ctrl.events.on(
		'changed',
		(payload: { collection: ICollection; item?: ICollectionItem }) => {
			emit?.('changed', payload)
		},
	)

	ctrl.events.on('change:items', (items: ICollectionItem[]) => {
		emit?.('change:items', items)
		emit?.('update:items', items)
	})

	ctrl.events.on('change:count', (count: number) => {
		emit?.('change:count', count)
	})

	ctrl.events.on('reset', () => {
		emit?.('reset')
	})

	// Пробрасываем события core-инстанса наружу (Vue events)
	ctrl.events.on(
		'item:added',
		(payload: { collection: ICollection; item: ICollectionItem }) => {
			emit?.('item:added', payload)
		},
	)

	ctrl.events.on(
		'item:deleted',
		(payload: { collection: ICollection; item: ICollectionItem }) => {
			emit?.('item:deleted', payload)
		},
	)

	ctrl.events.on(
		'item:beforeDelete',
		(payload: { collection: ICollection; index: number; item: ICollectionItem }) => {
			emit?.('item:beforeDelete', payload)
		},
	)

	ctrl.events.on(
		'item:afterDelete',
		(payload: { collection: ICollection; index: number; item: ICollectionItem }) => {
			emit?.('item:afterDelete', payload)
		},
	)

	ctrl.events.on(
		'item:beforeMove',
		(payload: { collection: ICollection; oldIndex: number; newIndex: number }) => {
			emit?.('item:beforeMove', payload)
		},
	)

	ctrl.events.on(
		'item:moved',
		(payload: {
			collection: ICollection
			item: ICollectionItem
			oldIndex: number
			newIndex: number
		}) => {
			emit?.('item:moved', payload)
		},
	)

	ctrl.events.on(
		'item:afterMove',
		(payload: {
			collection: ICollection
			item: ICollectionItem
			oldIndex: number
			newIndex: number
		}) => {
			emit?.('item:afterMove', payload)
		},
	)

	// Возвращаем реактивные Ref-ы для items и count
	return useSyncProps(ctrl.events, {
		items: {
			value: () => ctrl.items,
			triggers: ['item:added', 'item:afterMove', 'item:afterDelete', 'item:moved', 'changed'],
		},
		count: {
			value: () => ctrl.count,
			triggers: ['item:added', 'item:afterMove', 'item:afterDelete', 'item:moved', 'changed'],
		},
	})
}
