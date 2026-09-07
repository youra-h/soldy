/**
 * Дескриптор Spinner (TSpinner).
 *
 * Наследует ComponentViewDescriptor (rendered, visible, present, tag, classes, element, instance)
 * и добавляет size, variant, borderWidth + плагин SpinnerStyle.
 */

import { defineComponent } from '../base'
import { TSpinner } from '@soldy/core'
import type { ISpinnerProps, TSpinnerEvents } from '@soldy/core'
import { SpinnerLayoutPluginDescriptor, AriaPluginDescriptor } from '../plugins'
import { SpinnerContribution } from '../../contributions'
import { StylableDescriptor } from './stylable.descriptor'

export const SpinnerDescriptor = () =>
	defineComponent<ISpinnerProps, TSpinnerEvents>()({
		ctor: TSpinner,

		extends: StylableDescriptor(),

		contribution: SpinnerContribution(),

		// Спиннер объявляет себя как `role="status"`; без имени и содержимого
		// эта живая область молчит, поэтому имя ему нужно.
		plugins: [SpinnerLayoutPluginDescriptor(), AriaPluginDescriptor()],
	})
