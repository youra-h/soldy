import type { PropType, Ref } from 'vue'
import { track } from '@soldy/core'
import {
	type IList,
	type IListProps,
	type IListItem,
	TList,
	type TSelectionMode,
	type TScrollBehavior,
	type ICollectionSource,
} from '@soldy/core'
import {
	BaseControl,
	emitsControl,
	propsControl,
	syncControl,
	type IControlState,
} from '../control'
import {
	emitsSelectableCollection,
	syncSelectableCollection,
	propsSelectableCollection,
	type ISelectableCollectionState,
} from '../collection/selectable'
import type { TEmits, TProps, ISyncComponentOptions } from '../../types'
import { useSyncProps } from '../../composables/useSyncProps'
import { useInheritProps } from '../../composables/useInheritProps'

export const emitsList: TEmits = [
	...emitsControl,
	...emitsSelectableCollection,
	'change:maxRows',
	'update:maxRows',
	'change:autoWidth',
	'update:autoWidth',
	'change:wordWrap',
	'update:wordWrap',
	'change:scrollBehavior',
	'update:scrollBehavior',
	'itemDisabled',
	'itemText',
	'itemRendered',
	'itemVisible',
	'itemPresent',
] as const

export const propsList: TProps = {
	...useInheritProps(propsControl, TList),
	...propsSelectableCollection,
	mode: {
		type: String as PropType<TSelectionMode>,
		default: TList.defaultValues.mode,
	},
	maxRows: {
		type: Number as PropType<IListProps['maxRows']>,
		default: TList.defaultValues.maxRows,
	},
	autoWidth: {
		type: Boolean as PropType<IListProps['autoWidth']>,
		default: TList.defaultValues.autoWidth,
	},
	wordWrap: {
		type: Boolean as PropType<IListProps['wordWrap']>,
		default: TList.defaultValues.wordWrap,
	},
	scrollBehavior: {
		type: String as PropType<TScrollBehavior>,
		default: TList.defaultValues.scrollBehavior,
	},
}

export default {
	name: 'BaseList',
	extends: BaseControl,
	emits: emitsList,
	props: propsList,
}

export interface IListState<TItem extends IListItem = IListItem>
	extends IControlState, ISelectableCollectionState<TItem> {}

export function syncList<TItem extends IListItem = IListItem>(
	options: ISyncComponentOptions<IListProps<TItem> & ICollectionSource<TItem>, IList<TItem>>,
): IListState<TItem> {
	const syncPropsControl = syncControl(options)

	const { props, instance, emit, plugins } = options

	const syncPropsSelectableCollection = syncSelectableCollection<TItem>({
		props,
		instance: instance.collection,
		emit,
		plugins,
	})

	instance.events.on('itemDisabled', (item: IListItem, value: boolean) => {
		emit?.('itemDisabled', item, value)
	})

	instance.events.on('itemText', (item: IListItem, value: string) => {
		emit?.('itemText', item, value)
	})

	instance.events.on('itemRendered', (item: IListItem, value: boolean) => {
		emit?.('itemRendered', item, value)
	})

	instance.events.on('itemVisible', (item: IListItem, value: boolean) => {
		emit?.('itemVisible', item, value)
	})

	instance.events.on('itemPresent', (item: IListItem, value: boolean) => {
		emit?.('itemPresent', item, value)
	})

	instance.events.on('change:maxRows', (value: number) => {
		emit?.('change:maxRows', value)
		emit?.('update:maxRows', value)
	})

	instance.events.on('change:autoWidth', (value: boolean) => {
		emit?.('change:autoWidth', value)
		emit?.('update:autoWidth', value)
	})

	instance.events.on('change:wordWrap', (value: boolean) => {
		emit?.('change:wordWrap', value)
		emit?.('update:wordWrap', value)
	})

	instance.events.on('change:scrollBehavior', (value: TScrollBehavior) => {
		emit?.('change:scrollBehavior', value)
		emit?.('update:scrollBehavior', value)
	})

	track(props, 'mode', (value) => {
		if (value !== undefined && value !== instance.mode) {
			instance.mode = value
		}
	})

	track(props, 'maxRows', (value) => {
		if (value !== undefined && value !== instance.maxRows) {
			instance.maxRows = value
		}
	})

	track(props, 'autoWidth', (value) => {
		if (value !== undefined && value !== instance.autoWidth) {
			instance.autoWidth = value
		}
	})

	track(props, 'wordWrap', (value) => {
		if (value !== undefined && value !== instance.wordWrap) {
			instance.wordWrap = value
		}
	})

	track(props, 'scrollBehavior', (value) => {
		if (value !== undefined && value !== instance.scrollBehavior) {
			instance.scrollBehavior = value
		}
	})

	return {
		...syncPropsControl,
		...syncPropsSelectableCollection,
		...useSyncProps(instance.events as any, {}),
	}
}
