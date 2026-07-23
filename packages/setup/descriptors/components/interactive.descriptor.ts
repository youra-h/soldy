/**
 * Дескриптор Interactive (TInteractive).
 *
 * Наследует ComponentViewDescriptor (rendered, visible, present, tag, classes, element, instance)
 * и добавляет disabled, focused.
 */

import { defineComponent } from '../base'
import { TInteractive } from '@soldy/core'
import { InteractiveContribution } from '../../contributions'
import { ComponentViewDescriptor } from './component-view.descriptor'

export const InteractiveDescriptor = defineComponent({
	ctor: TInteractive,

	extends: ComponentViewDescriptor,

	contribution: InteractiveContribution,
})
