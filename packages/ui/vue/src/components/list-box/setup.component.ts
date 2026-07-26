import { toRaw } from 'vue'
import { createAdapterContext, withCollection, ListBoxDescriptor } from '@soldy/setup'
import { useVue, vueElevatorFactory } from '../../adapter'
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
		}).use(withCollection(vueElevatorFactory))

		return useVue(adapter, props, emit)
	},
}
