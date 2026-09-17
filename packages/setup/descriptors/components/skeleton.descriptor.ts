/**
 * Дескриптор Skeleton (TSkeleton).
 *
 * Наследует ComponentViewDescriptor (rendered, visible, present, tag, classes, element, instance)
 * и добавляет variant, shape, animation, width, height + плагин SkeletonLayout.
 * `variant` объявлен здесь, а не взят у Stylable: `TSkeleton` наследует
 * `TComponentView`, и `size` у него нет.
 */

import { defineComponent, defineDescriptor } from '../../define'
import { TSkeleton } from '@soldy/core'
import type { ISkeletonProps, TSkeletonEvents } from '@soldy/core'
import { SkeletonLayoutPluginDescriptor } from '../plugins'
import { SkeletonContribution } from '../../contributions'
import { ComponentViewDescriptor } from './component-view.descriptor'

export const SkeletonDescriptor = defineDescriptor(() =>
	defineComponent<ISkeletonProps, TSkeletonEvents>()({
		ctor: TSkeleton,

		extends: ComponentViewDescriptor(),

		contribution: SkeletonContribution(),

		plugins: [SkeletonLayoutPluginDescriptor()],
	}),
)
