import type { SetupContext } from 'vue'
import { TSkeleton, type ISkeletonProps, type ISkeleton } from '@soldy/core'
import { useInstance } from '../../composables/useInstance'
import { useBundle } from '../../composables/useBundle'
import { useElementBinding } from '../../composables/useElementBinding'
import { useInstanceBinding } from '../../composables/useInstanceBinding'
import BaseSkeleton, { syncSkeleton } from './base.component'
import { createComponentViewBundle, TSkeletonStylePlugin } from '@soldy/plugins'
import type { TBaseComponentViewProps } from '../component-view'

export default {
	name: '_Skeleton',
	extends: BaseSkeleton,
	setup(props: TBaseComponentViewProps<ISkeletonProps, ISkeleton>, { emit }: SetupContext) {
		const instance = useInstance(TSkeleton, props)
		const plugins = useBundle(createComponentViewBundle, props?.plugins).use(
			TSkeletonStylePlugin,
		)

		useInstanceBinding(plugins, instance)
		const rootRef = useElementBinding(plugins)

		const { tag, rendered, visible, present, classes, variant, size, shape, animation } =
			syncSkeleton({
				props,
				instance,
				plugins,
				emit,
			})

		return {
			ctrl: instance,
			plugins,
			rootRef,
			tag,
			rendered,
			visible,
			present,
			classes,
			variant,
			size,
			shape,
			animation,
		}
	},
}
