import { toRaw } from 'vue'
import { createAdapterContext, TCollectionExtension, ListBoxDescriptor } from '@soldy/setup'
import { useVue, VueElevatorFactory } from '../../adapter'
import BaseListBox from './base.component'
import type { TBaseComponentProps } from '../../types'
import { type IListBoxProps, type IListBox } from '@soldy/core'

export default {
	name: '_ListBox',
	extends: BaseListBox,
	setup(props: TBaseComponentProps<IListBoxProps, IListBox>, { emit }: any) {
		const adapter = createAdapterContext(ListBoxDescriptor, {
			ctrl: props.ctrl ? toRaw(props.ctrl) : undefined,
			plugins: props.plugins,
			props,
		}).use(TCollectionExtension, { elevator: VueElevatorFactory })

		return useVue<IListBoxProps, IListBox>(adapter, props, emit)
	},
}
