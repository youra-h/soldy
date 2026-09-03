/**
 * Дескриптор Control (TControl).
 *
 * Наследует StylableDescriptor (size, variant, rendered, visible, present, tag, classes, element, instance)
 * и добавляет disabled, focused.
 */

import { defineComponent } from '../base'
import { TControl } from '@soldy/core'
import type { IControlProps, TControlEvents } from '@soldy/core'
import { ControlContribution } from '../../contributions'
import { StylableDescriptor } from './stylable.descriptor'

export const ControlDescriptor = () =>
	defineComponent<IControlProps, TControlEvents>()({
		ctor: TControl,

		extends: StylableDescriptor(),

		contribution: ControlContribution(),
	})
