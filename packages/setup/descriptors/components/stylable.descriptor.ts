/**
 * Дескриптор Stylable (TStylable).
 *
 * Наследует ComponentViewDescriptor (rendered, visible, present, tag, classes, element, instance)
 * и добавляет size, variant.
 */

import { defineComponent } from '../base'
import { TStylable } from '@soldy/core'
import { StylableContribution } from '../../contributions'
import { ComponentViewDescriptor } from './component-view.descriptor'

export const StylableDescriptor = defineComponent({
	ctor: TStylable,

	extends: ComponentViewDescriptor,

	contribution: StylableContribution,
})
