/**
 * Дескриптор Stylable (TStylable).
 *
 * Наследует ComponentViewDescriptor (rendered, visible, present, tag, classes, element, instance)
 * и добавляет size, variant.
 */

import { defineComponent, defineDescriptor } from '../../define'
import { TStylable } from '@soldy/core'
import { ComponentViewDescriptor } from './component-view.descriptor'

export const StylableDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TStylable,

		extends: ComponentViewDescriptor(),

		contribution: {
			props: {
				size: { type: String, triggers: ['change:size'] },
				variant: { type: String, triggers: ['change:variant'] },
			},
		},
	}),
)
