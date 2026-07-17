import type { SetupContext } from 'vue'
import { type IComponentViewProps, type IComponentView } from '@soldy/core'
import { componentViewSchema } from '@soldy/schema'
import BaseComponentView from './base.component'
import { useAdapter } from '../../adapter'
import type { TBaseComponentViewProps } from './types'

export default {
	name: '_ComponentView',
	extends: BaseComponentView,
	setup(
		props: TBaseComponentViewProps<IComponentViewProps, IComponentView>,
		{ emit }: SetupContext,
	) {
		const { instance, refs, plugins, rootElement } = useAdapter(
			componentViewSchema,
			props,
			emit,
		)

		return { ctrl: instance, plugins, rootElement, ...refs }
	},
}
