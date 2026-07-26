import { toRaw } from 'vue'
import { createAdapterContext, SpinnerDescriptor } from '@soldy/setup'
import { useVue } from '../../adapter'
import BaseSpinner from './base.component'
import type { TBaseComponentProps } from '../../types'
import { type ISpinnerProps, type ISpinner } from '@soldy/core'

export default {
	name: '_Spinner',
	extends: BaseSpinner,
	setup(props: TBaseComponentProps<ISpinnerProps, ISpinner>, { emit }: any) {
		const adapter = createAdapterContext(SpinnerDescriptor, {
			ctrl: props.ctrl ? toRaw(props.ctrl) : undefined,
			plugins: props.plugins,
			props,
		})

		return useVue(adapter, props, emit)
	},
}
