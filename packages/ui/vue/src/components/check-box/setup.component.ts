import type { SetupContext } from 'vue'
import { TCheckBox, type ICheckBox, type ICheckBoxProps } from '@soldy/core'
import BaseCheckBox, { syncCheckBox } from './base.component'
import {
	useInstance,
	useIconImport,
	useBundle,
	useElementBinding,
	useInstanceBinding,
	useSplitAttrs,
} from '../../composables'
import { createInputBoolBundle } from '@soldy/plugins'
import type { TBaseComponentViewProps } from '../component-view'

export default {
	name: '_CheckBox',
	inheritAttrs: false,
	extends: BaseCheckBox,
	setup(props: TBaseComponentViewProps<ICheckBoxProps, ICheckBox>, { emit }: SetupContext) {
		const instance = useInstance(TCheckBox, props)

		const plugins = useBundle(createInputBoolBundle, props?.plugins)

		useInstanceBinding(plugins, instance)

		const rootElement = useElementBinding(plugins)

		const {
			rendered,
			visible,
			classes,
			disabled,
			name,
			size,
			indeterminate,
			plain,
			value,
			readonly,
			required,
		} = syncCheckBox({
			props,
			instance,
			plugins,
			emit,
		})

		const defaultIconTag = useIconImport('check')
		const defaultIndeterminateIconTag = useIconImport('checkIndeterminate')

		const { containerAttrs, controlAttrs } = useSplitAttrs()

		return {
			containerAttrs,
			controlAttrs,
			ctrl: instance,
			defaultIconTag,
			defaultIndeterminateIconTag,
			plugins,
			rootElement,
			rendered,
			visible,
			classes,
			disabled,
			name,
			size,
			indeterminate,
			plain,
			value,
			readonly,
			required,
		}
	},
}
