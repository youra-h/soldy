import { BaseControl } from '../control'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps } from '../../types/common'
import { ListDescriptor } from '@soldy/setup'

export const emitsList: TEmits = useEmits(ListDescriptor) as unknown as TEmits

export const propsList: TProps = useProps(ListDescriptor) as TProps

export default {
	name: 'BaseList',
	extends: BaseControl,
	emits: emitsList,
	props: propsList,
}
		instance: instance.collection,
		emit,
		plugins,
	})

	instance.events.on('item:disabled', (item: IListItem, value: boolean) => {
		emit?.('item:disabled', item, value)
	})

	instance.events.on('item:text', (item: IListItem, value: string) => {
		emit?.('item:text', item, value)
	})

	instance.events.on('item:rendered', (item: IListItem, value: boolean) => {
		emit?.('item:rendered', item, value)
	})

	instance.events.on('item:visible', (item: IListItem, value: boolean) => {
		emit?.('item:visible', item, value)
	})

	instance.events.on('item:present', (item: IListItem, value: boolean) => {
		emit?.('item:present', item, value)
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
