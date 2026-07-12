import type { PropType, Ref } from 'vue'
import { track } from '@soldy/core'
import {
	type ICollectionSource,
	type ISelectableCollection,
	type ISelectableCollectionProps,
	type ISelectableCollectionItem,
	type TSelectionMode,
	type TSelectableCollectionEvents,
	TSelectableCollection,
} from '@soldy/core'
import {
	default as BaseCollection,
	emitsCollection,
	propsCollection,
	syncCollection,
	type ICollectionState,
} from '../base.component'
import type { TEmits, TProps, ISyncComponentOptions } from '../../../types'
import { useSyncProps } from '../../../composables/useSyncProps'

export const emitsSelectableCollection: TEmits = [
	...emitsCollection,
	'itemSelected',
	'itemUnselected',
	'changeSelected',
	'changeMode',
	'update:mode',
	'changeSelectedCount',
] as const

export const propsSelectableCollection: TProps = {
	...propsCollection,
	mode: {
		type: String as PropType<TSelectionMode>,
		default: TSelectableCollection.defaultValues.mode,
	},
}

export default {
	name: 'BaseSelectableCollection',
	extends: BaseCollection,
	emits: emitsSelectableCollection,
	props: propsSelectableCollection,
}

export interface ISelectableCollectionState<TItem = ISelectableCollectionItem>
	extends ICollectionState<TItem> {
	selected: Ref<TItem[]>
	selectedCount: Ref<number>
	mode: Ref<TSelectionMode>
}

/**
 * Синхронизация props и событий для SelectableCollection
 */
export function syncSelectableCollection<
	TItem extends ISelectableCollectionItem = ISelectableCollectionItem,
>(
	options: ISyncComponentOptions<
		ISelectableCollectionProps<TItem> & ICollectionSource<TItem>,
		ISelectableCollection<ISelectableCollectionProps, TSelectableCollectionEvents, TItem>
	>,
): ISelectableCollectionState<TItem> {
	const syncProps = syncCollection(options)

	const { props, instance, emit } = options

	// Пробрасываем события core-инстанса наружу (Vue events)
	instance.events.on(
		'itemSelected',
		(payload: { collection: ISelectableCollection; item: ISelectableCollectionItem }) => {
			emit?.('itemSelected', payload)
		},
	)

	instance.events.on(
		'itemUnselected',
		(payload: { collection: ISelectableCollection; item: ISelectableCollectionItem }) => {
			emit?.('itemUnselected', payload)
		},
	)

	instance.events.on('changeSelected' as any, (items: ISelectableCollectionItem[]) => {
		emit?.('changeSelected', items)
	})

	instance.events.on('changeSelectedCount' as any, (count: number) => {
		emit?.('changeSelectedCount', count)
	})

	instance.events.on('changeMode' as any, (mode: TSelectionMode) => {
		emit?.('changeMode', mode)
		emit?.('update:mode', mode)
	})

	track(props, 'mode', (value) => {
		if (value !== undefined && value !== instance.mode) {
			instance.mode = value
		}
	})

	return {
		...syncProps,
		...useSyncProps(instance.events, {
			selected: () => instance.selected,
			selectedCount: () => instance.selectedCount,
			mode: () => instance.mode,
		}),
	}
}
