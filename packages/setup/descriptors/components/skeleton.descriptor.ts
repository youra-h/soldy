/**
 * Дескриптор Skeleton (TSkeleton).
 *
 * Наследует StylableDescriptor (size, variant, rendered, visible, present, tag, classes, element, instance)
 * и добавляет shape, animation, width, height + плагин SkeletonStyle.
 */

import { defineComponent, definePlugin } from '../base'
import { TSkeleton } from '@soldy/core'
import { TSkeletonStylesPlugin } from '@soldy/plugins'
import { SkeletonContribution, SkeletonStylesContribution } from '../../contributions'
import { StylableDescriptor } from './stylable.descriptor'

export const SkeletonDescriptor = defineComponent({
	ctor: TSkeleton,

	extends: StylableDescriptor,

	contribution: SkeletonContribution,

	plugins: [
		definePlugin({
			ctor: TSkeletonStylesPlugin,
			contribution: SkeletonStylesContribution,
		}),
	],
})
