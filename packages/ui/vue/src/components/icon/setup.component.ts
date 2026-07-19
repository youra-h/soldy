import type { SetupContext } from 'vue'
import { toRaw } from 'vue'
import { TIcon, type IIconProps, type IIcon } from '@soldy/core'
import { TInstancePlugin } from '@soldy/plugins'
import { IconDescriptor } from '@soldy/setup'
import { useElementBinding } from '../../composables/useElementBinding'
import { useComponentRuntime } from '../../composables/useComponentRuntime'
import BaseIcon from './base.component'
import type { TBaseComponentViewProps } from '../component-view'

export default {
	name: '_Icon',
	extends: BaseIcon,
	setup(
		props: TBaseComponentViewProps<IIconProps, IIcon>,
		{ emit }: SetupContext,
	) {
		const providedCtrl = props.ctrl
		const instance: IIcon =
			(providedCtrl ? toRaw(providedCtrl) : undefined) ??
			(new TIcon({ props }) as unknown as IIcon)

		const providedPlugins = props.plugins
		const bundle = providedPlugins ?? IconDescriptor.createBundle()

		const instancePlugin = bundle.get(TInstancePlugin)!
		instancePlugin.instance = instance

		const runtime = IconDescriptor.createRuntime({
			instance: toRaw(instance) as any,
			bundle,
		})

		const { refs } = useComponentRuntime(runtime, props, emit)

		const rootElement = useElementBinding(bundle)

		return { ctrl: instance, plugins: bundle, rootElement, ...refs }
	},
}
