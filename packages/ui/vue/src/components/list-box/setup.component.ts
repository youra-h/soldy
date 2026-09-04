import { toRaw } from 'vue'
import {
	createAdapterContext,
	TCollectionExtension,
	TDragAndDropCollectionExtension,
	ListBoxDescriptor,
	ListBoxCollectionDescriptor,
} from '@soldy/setup'
import { TListBoxCollectionFacade } from '@soldy/core'
import { useAdapter, VueElevatorFactory } from '../../adapter'
import BaseListBox, { type ListBoxProps } from './base.component'
import { type IListBoxProps, type IListBoxComponentProps, type IListBox } from '@soldy/core'

export default {
	name: '_ListBox',
	extends: BaseListBox,
	setup(props: ListBoxProps, { emit }: any) {
		const adapter = createAdapterContext(ListBoxDescriptor(), {
			ctrl: toRaw(props.ctrl),
			props,
		})

		const refs = useAdapter<IListBoxComponentProps, IListBox>(adapter, props, emit)

		const collectionAdapter = createAdapterContext(
			ListBoxCollectionDescriptor(),
			{
				props,
				options: { owner: adapter.instance },
			},
			{ bundle: adapter.bundle, defaultExtensions: [] },
		)
			.use(TCollectionExtension, { elevator: VueElevatorFactory })
			.use(TDragAndDropCollectionExtension, { elevator: VueElevatorFactory })

		const refsCollection = useAdapter<Record<string, any>, TListBoxCollectionFacade>(
			collectionAdapter,
			props,
			emit,
		)

		return { ...refs, ...refsCollection }
	},
}
