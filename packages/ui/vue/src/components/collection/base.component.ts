import type { PropType, Ref } from 'vue'
import { track } from '@soldy/core'
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
	'changeItems',
	'update:items',
	'changeCount',
	'reset',
	'itemAdded',
	'itemBeforeDelete',
	'itemDeleted',
	'itemAfterDelete',
	'itemBeforeMove',
	'itemMoved',
	'itemAfterMove',
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
	const { instance, emit, props, plugins } = options

	useProvideCollection(instance)

	const collectionItemPlugins = plugins.get(TCollectionItemPlugins)

	if (collectionItemPlugins) {
		useProvideCollectionPlugins((uid, bundle) => {
			collectionItemPlugins?.register(uid, bundle)
		})
	}

	// Если компонент находится внутри контекста DragAndDrop, активируем плагин для этой коллекции
	if (useInjectDragContext()) {
		plugins.get(TDragPlugin)?.activate(instance)
	}

	track(props, 'items', (items) => {
		if (items !== undefined) {
			if (props.trackBy) {
				instance.patchItems(items, props.trackBy)
			} else {
				instance.setItems(items)
			}
		}
	})

	instance.events.on(
		'changed',
		(payload: { collection: ICollection; item?: ICollectionItem }) => {
			emit?.('changed', payload)
		},
	)

	instance.events.on('changeItems', (items: ICollectionItem[]) => {
		emit?.('changeItems', items)
		emit?.('update:items', items)
	})

	instance.events.on('changeCount', (count: number) => {
		emit?.('changeCount', count)
	})

	instance.events.on('reset', () => {
		emit?.('reset')
	})

	// Пробрасываем события core-инстанса наружу (Vue events)
	instance.events.on(
		'itemAdded',
		(payload: { collection: ICollection; item: ICollectionItem }) => {
			emit?.('itemAdded', payload)
		},
	)

	instance.events.on(
		'itemDeleted',
		(payload: { collection: ICollection; item: ICollectionItem }) => {
			emit?.('itemDeleted', payload)
		},
	)

	instance.events.on(
		'itemBeforeDelete',
		(payload: { collection: ICollection; index: number; item: ICollectionItem }) => {
			emit?.('itemBeforeDelete', payload)
		},
	)

	instance.events.on(
		'itemAfterDelete',
		(payload: { collection: ICollection; index: number; item: ICollectionItem }) => {
			emit?.('itemAfterDelete', payload)
		},
	)

	instance.events.on(
		'itemBeforeMove',
		(payload: { collection: ICollection; oldIndex: number; newIndex: number }) => {
			emit?.('itemBeforeMove', payload)
		},
	)

	instance.events.on(
		'itemMoved',
		(payload: {
			collection: ICollection
			item: ICollectionItem
			oldIndex: number
			newIndex: number
		}) => {
			emit?.('itemMoved', payload)
		},
	)

	instance.events.on(
		'itemAfterMove',
		(payload: {
			collection: ICollection
			item: ICollectionItem
			oldIndex: number
			newIndex: number
		}) => {
			emit?.('itemAfterMove', payload)
		},
	)

	// Возвращаем реактивные Ref-ы для items и count
	return useSyncProps(instance.events, {
		items: {
			value: () => instance.items,
			triggers: ['itemAdded', 'itemAfterMove', 'itemAfterDelete', 'itemMoved', 'changed'],
		},
		count: {
			value: () => instance.count,
			triggers: ['itemAdded', 'itemAfterMove', 'itemAfterDelete', 'itemMoved', 'changed'],
		},
	})
}
