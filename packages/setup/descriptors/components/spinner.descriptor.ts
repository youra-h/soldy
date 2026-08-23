/**
 * Дескриптор Spinner (TSpinner).
 *
 * Наследует ComponentViewDescriptor (rendered, visible, present, tag, classes, element, instance)
 * и добавляет size, variant, borderWidth + плагин SpinnerStyle.
 */

import { defineComponent } from '../base'
import { TSpinner } from '@soldy/core'
import { SpinnerLayoutPluginDescriptor } from '../plugins'
import { SpinnerContribution } from '../../contributions'
import { StylableDescriptor } from './stylable.descriptor'

export const SpinnerDescriptor = defineComponent({
	ctor: TSpinner,

	extends: StylableDescriptor,

	contribution: SpinnerContribution,

	plugins: [SpinnerLayoutPluginDescriptor],
})
