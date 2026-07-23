/**
 * Дескриптор Spinner (TSpinner).
 *
 * Наследует ComponentViewDescriptor (rendered, visible, present, tag, classes, element, instance)
 * и добавляет size, variant, borderWidth + плагин SpinnerStyle.
 */

import { defineComponent, definePlugin } from '../base'
import { TSpinner } from '@soldy/core'
import { TSpinnerStylePlugin } from '@soldy/plugins'
import { SpinnerContribution, SpinnerStyleContribution } from '../../contributions'
import { ComponentViewDescriptor } from './component-view.descriptor'

export const SpinnerDescriptor = defineComponent({
	ctor: TSpinner,

	extends: ComponentViewDescriptor,

	contribution: SpinnerContribution,

	plugins: [
		definePlugin({
			ctor: TSpinnerStylePlugin,
			contribution: SpinnerStyleContribution,
		}),
	],
})
