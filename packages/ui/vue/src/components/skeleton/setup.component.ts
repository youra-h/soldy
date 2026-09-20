import { SkeletonDescriptor } from '@soldy/setup'
import { useAdapter, createVueAdapterContext, type SetupContext } from '../../adapter'
import BaseSkeleton, { type SkeletonProps } from './base.component'

export default {
	name: '_Skeleton',
	extends: BaseSkeleton,
	setup(props: SkeletonProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(SkeletonDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		// Выход `layout_styles` шаблон кладёт в `:style` корня
		return useAdapter(adapter, props, emit)
	},
}
