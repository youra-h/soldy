/**
 * Дескриптор CollapseItemCustom (TCollapseItemCustom).
 *
 * Наследует ValueControlDescriptor (value, name, disabled, focused, size, variant, ...)
 * и добавляет tag, text, arrowPlacement.
 */

import { defineComponent } from '../../base'
import { TCollapseItemCustom } from '@soldy/core'
import { CollapseItemCustomContribution } from '../../../contributions'
import { ValueControlDescriptor } from '../value-control.descriptor'

export const CollapseItemCustomDescriptor = defineComponent({
	ctor: TCollapseItemCustom,

	extends: ValueControlDescriptor,

	contribution: CollapseItemCustomContribution,
})
