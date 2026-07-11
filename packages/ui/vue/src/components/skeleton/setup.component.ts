import type { SetupContext } from 'vue'
import { TSkeleton, type ISkeletonProps, type ISkeleton } from '@soldy/core'
import BaseSkeleton, { syncSkeleton } from './base.component'
import { createComponentViewBundle, TSkeletonStylePlugin } from '@soldy/plugins'
import { useComponentSetup } from '../../composables/useComponentSetup'
import type { TBaseComponentViewProps } from '../component-view'

export default {
	name: '_Skeleton',
	extends: BaseSkeleton,
	setup(props: TBaseComponentViewProps<ISkeletonProps, ISkeleton>, ctx: SetupContext) {
		return useComponentSetup({
			Ctor: TSkeleton,
			plugins: () => createComponentViewBundle().use(TSkeletonStylePlugin),
			sync: (ctx) => syncSkeleton(ctx),
		})(props, ctx)
	},
}
