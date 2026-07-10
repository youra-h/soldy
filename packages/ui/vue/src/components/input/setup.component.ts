import type { SetupContext } from 'vue'
import { TInput, type IInputProps, type IInput } from '@soldy/core'
import BaseInput, { syncInput } from './base.component'
import { useInstance } from '../../composables/useInstance'
import { useBundle } from '../../composables/useBundle'
import { useElementBinding } from '../../composables/useElementBinding'
import { useInstanceBinding } from '../../composables/useInstanceBinding'
import { useSplitAttrs } from '../../composables/useSplitAttrs'
import { createInputBundle } from '@soldy/plugins'
import type { TBaseComponentViewProps } from '../component-view'

export default {
	name: '_Input',
	inheritAttrs: false,
	extends: BaseInput,
	setup(props: TBaseComponentViewProps<IInputProps, IInput>, { emit }: SetupContext) {
		const instance = useInstance(TInput, props)

		const plugins = useBundle(createInputBundle, props?.plugins)
		useInstanceBinding(plugins, instance)

		const rootRef = useElementBinding(plugins)

		const { rendered, visible, classes, disabled, name, size, value, readonly, required, placeholder } =
			syncInput({
				props,
				instance,
				plugins,
				emit,
			})

		const { containerAttrs, controlAttrs } = useSplitAttrs()

		return {
			containerAttrs,
			controlAttrs,
			instance,
			plugins,
			rootRef,
			rendered,
			visible,
			classes,
			disabled,
			name,
			size,
			value,
			readonly,
			required,
			placeholder,
		}
	},
}
