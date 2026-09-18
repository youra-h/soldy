import { IconDescriptor, type DescriptorPluginOutputs } from '@soldy/setup'
import { useAdapter, createVueAdapterContext, type SetupContext } from '../../adapter'
import BaseIcon, { type IconProps } from './base.component'
import { type IIconProps, type IIcon } from '@soldy/core'

export default {
	name: '_Icon',
	extends: BaseIcon,
	setup(props: IconProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(IconDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		// Выход `layout_styles` шаблон кладёт в `:style` корня
		return useAdapter<IIconProps, IIcon, DescriptorPluginOutputs<typeof IconDescriptor>>(
			adapter,
			props,
			emit,
		)
	},
}
