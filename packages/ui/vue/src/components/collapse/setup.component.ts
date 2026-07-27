import { toRaw } from 'vue'
import { createAdapterContext, TCollectionExtension, CollapseDescriptor } from '@soldy/setup'
import { useVue, VueElevatorFactory } from '../../adapter'
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
		}).use(TCollectionExtension, { elevator: VueElevatorFactory })

		return useVue<ICollapseProps, ICollapse>(adapter, props, emit)
	},
}
