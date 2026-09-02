/**
 * Дескриптор Spinner (TSpinner).
 *
 * Наследует ComponentViewDescriptor (rendered, visible, present, tag, classes, element, instance)
 * и добавляет size, variant, borderWidth + плагин SpinnerStyle.
 */

import { defineComponent, definePlugin } from '../base'
import { TSpinner } from '@soldy/core'
import { TSpinnerStylesPlugin } from '@soldy/plugins'
import { SpinnerContribution, SpinnerStylesContribution } from '../../contributions'
import { StylableDescriptor } from './stylable.descriptor'

export const SpinnerDescriptor = defineComponent({
	ctor: TSpinner,

	extends: StylableDescriptor,

	contribution: SpinnerContribution,

	plugins: [
		definePlugin({
			ctor: TSpinnerStylesPlugin,
			contribution: SpinnerStylesContribution,
		}),
	],
})
