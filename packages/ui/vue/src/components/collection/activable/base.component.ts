import type { Ref } from 'vue'
import {
	type ICollectionSource,
	type IActivatableCollection,
	type IActivatableCollectionProps,
	type IActivatableCollectionItem,
	type TActivatableCollectionEvents,
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

export const emitsActivatableCollection: TEmits = [
	...emitsCollection,
	'itemActivated',
	'itemDeactivated',
	'changeActiveItem',
] as const

export const propsActivatableCollection: TProps = {
	...propsCollection,
}

export default {
	name: 'BaseActivatableCollection',
	extends: BaseCollection,
	emits: emitsActivatableCollection,
	props: propsActivatableCollection,
}

export interface IActivatableCollectionState<TItem = any> extends ICollectionState<TItem> {
	activeItem: Ref<TItem | undefined>
}

/**
 * Синхронизация props и событий для ActivatableCollection
 */
export function syncActivatableCollection<
	TItem extends IActivatableCollectionItem = IActivatableCollectionItem,
>(
	options: ISyncComponentOptions<
		IActivatableCollectionProps<TItem> & ICollectionSource<TItem>,
		IActivatableCollection<IActivatableCollectionProps, TActivatableCollectionEvents, TItem>
	>,
): IActivatableCollectionState<TItem> {
	const syncProps = syncCollection(options)

	const { instance, emit } = options

	// Пробрасываем события core-инстанса наружу (Vue events)
	instance.events.on(
		'itemActivated',
		(payload: { collection: IActivatableCollection; item: IActivatableCollectionItem }) => {
			emit?.('itemActivated', payload)
		},
	)

	instance.events.on('itemDeactivated', (payload: { collection: IActivatableCollection }) => {
		emit?.('itemDeactivated', payload)
	})

	return {
		...syncProps,
		...useSyncProps(instance.events, {
			activeItem: {
				value: () => instance.activeItem,
				triggers: ['itemActivated', 'itemDeactivated'],
			},
		}),
	}
}
