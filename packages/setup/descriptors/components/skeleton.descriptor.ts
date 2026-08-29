/**
 * Дескриптор Skeleton (TSkeleton).
 *
 * Наследует StylableDescriptor (size, variant, rendered, visible, present, tag, classes, element, instance)
 * и добавляет shape, animation, width, height + плагин SkeletonStyle.
 */

import { defineComponent } from '../base'
import { TSkeleton } from '@soldy/core'
import { SkeletonLayoutPluginDescriptor } from '../plugins'
import { SkeletonContribution } from '../../contributions'
import { ComponentViewDescriptor } from './component-view.descriptor'

export const SkeletonDescriptor = () =>
	defineComponent({
		ctor: TSkeleton,

		extends: ComponentViewDescriptor(),

		contribution: SkeletonContribution(),

		plugins: [SkeletonLayoutPluginDescriptor()],
	})
