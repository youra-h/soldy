/**
 * Дескриптор Skeleton (TSkeleton).
 *
 * Наследует ComponentViewDescriptor (rendered, visible, present, tag, classes, element, instance)
 * и добавляет variant, shape, animation, width, height + плагин SkeletonLayout.
 * `variant` объявлен здесь, а не взят у Stylable: `TSkeleton` наследует
 * `TComponentView`, и `size` у него нет.
 */

import { defineComponent, defineDescriptor } from '../../../protected/define'
import { TSkeleton } from '@soldy-ui/core'
import { SkeletonLayoutPluginDescriptor } from '../plugins'
import { ComponentViewDescriptor } from './component-view.descriptor'

export const SkeletonDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TSkeleton,

		extends: ComponentViewDescriptor(),

		contribution: {
			props: {
				variant: { type: String, triggers: ['change:variant'] },
				shape: { type: String, triggers: ['change:shape'] },
				animation: { type: String, triggers: ['change:animation'] },
				width: { type: [Number, String], triggers: ['change:width'] },
				height: { type: [Number, String], triggers: ['change:height'] },
			},
		},

		plugins: [SkeletonLayoutPluginDescriptor],
	}),
)
