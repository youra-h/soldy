/**
 * Дескриптор Interactive (TInteractive).
 *
 * Наследует ComponentViewDescriptor (rendered, visible, present, tag, classes, element, instance)
 * и добавляет disabled, focused.
 */

import { defineComponent, defineDescriptor } from '../../../protected/define'
import { TInteractive } from '@soldy/core'
import { ComponentViewDescriptor } from './component-view.descriptor'

export const InteractiveDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TInteractive,

		extends: ComponentViewDescriptor(),

		contribution: {
			props: {
				disabled: { type: Boolean, triggers: ['change:disabled'] },
				focused: { type: Boolean, triggers: ['change:focused'] },
			},
		},
	}),
)
