/**
 * Дескриптор Spinner (TSpinner).
 *
 * Наследует ComponentViewDescriptor (rendered, visible, present, tag, classes, element, instance)
 * и добавляет size, variant, borderWidth + плагин SpinnerStyle.
 */

import { defineComponent, defineDescriptor } from '../../../protected/define'
import { TSpinner } from '@soldy/core'
import { SpinnerLayoutPluginDescriptor, AriaPluginDescriptor } from '../plugins'
import { StylableDescriptor } from './stylable.descriptor'

export const SpinnerDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TSpinner,

		extends: StylableDescriptor(),

		contribution: {
			props: {
				borderWidth: { type: [Number, String], triggers: ['change:borderWidth'] },
			},
		},

		// Спиннер объявляет себя как `role="status"`; без имени и содержимого
		// эта живая область молчит, поэтому имя ему нужно.
		plugins: [SpinnerLayoutPluginDescriptor, AriaPluginDescriptor],
	}),
)
