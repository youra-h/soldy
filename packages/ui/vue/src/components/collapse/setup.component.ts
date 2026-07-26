import { toRaw } from 'vue'
import { createAdapterContext, withCollection, CollapseDescriptor } from '@soldy/setup'
import { useVue, vueElevatorFactory } from '../../adapter'
import BaseCollapse from './base.component'
import type { TBaseComponentProps } from '../../types'
import { type ICollapseProps, type ICollapse } from '@soldy/core'

export default {
	name: '_Collapse',
	extends: BaseCollapse,
	setup(props: TBaseComponentProps<ICollapseProps, ICollapse>, { emit }: any) {
		const adapter = createAdapterContext(CollapseDescriptor, {
			ctrl: props.ctrl ? toRaw(props.ctrl) : undefined,
			plugins: props.plugins,
			props,
		}).use(withCollection(vueElevatorFactory))

		return useVue(adapter, props, emit)
	},
}
