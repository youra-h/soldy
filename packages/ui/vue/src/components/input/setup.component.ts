import type { SetupContext } from 'vue'
import { TInput, type IInputProps, type IInput } from '@soldy/core'
import BaseInput, { syncInput } from './base.component'
import { createInputBundle } from '@soldy/plugins'
import { useComponentSetup } from '../../composables/useComponentSetup'
import { useSplitAttrs } from '../../composables/useSplitAttrs'
import type { TBaseComponentViewProps } from '../component-view'

export default {
	name: '_Input',
	inheritAttrs: false,
	extends: BaseInput,
	setup(props: TBaseComponentViewProps<IInputProps, IInput>, ctx: SetupContext) {
		const base = useComponentSetup({
			Ctor: TInput,
			plugins: createInputBundle,
			sync: (ctx) => syncInput(ctx),
		})(props, ctx)

		return { ...base, ...useSplitAttrs() }
	},
}
