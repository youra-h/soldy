import { toRaw } from 'vue'
import {
	createAdapterContext,
	TCollectionExtension,
	TDragAndDropCollectionExtension,
	ListBoxDescriptor,
	ListBoxCollectionDescriptor,
} from '@soldy/setup'
import { useVue, useVueCollection, VueElevatorFactory } from '../../adapter'
import BaseListBox from './base.component'
import type { TBaseComponentProps } from '../../types'
import {
	type IListBoxProps,
	type IListBox,
	type IListBoxCollectionOutput,
} from '@soldy/core'

export default {
	name: '_ListBox',
	extends: BaseListBox,
	setup(props: TBaseComponentProps<IListBoxProps, IListBox>, { emit }: any) {
		const adapter = createAdapterContext(ListBoxDescriptor(), {
			ctrl: toRaw(props.ctrl),
			props,
		})
			.use(TCollectionExtension, {
				descriptor: ListBoxCollectionDescriptor(),
				engine: toRaw(props.engine),
				elevator: VueElevatorFactory,
			})
			.use(TDragAndDropCollectionExtension, { elevator: VueElevatorFactory })

		const collectionRefs = useVueCollection<IListBoxCollectionOutput>(adapter, props)

		return {
			...useVue<IListBoxProps, IListBox>(adapter, props, emit),
			...collectionRefs,
		}
	},
}
