import { useCollectionAdapter } from '../../adapter'
import { ListBoxDescriptor } from '@soldy/setup'
import BaseListBox from './base.component'
import type { TBaseComponentProps } from '../../types'
import { type IListBoxProps, type IListBox } from '@soldy/core'

export default {
	name: '_ListBox',
	extends: BaseListBox,
	setup(props: TBaseComponentProps<IListBoxProps, IListBox>, { emit }: any) {
		return useCollectionAdapter(ListBoxDescriptor, props, emit)
	},
}
