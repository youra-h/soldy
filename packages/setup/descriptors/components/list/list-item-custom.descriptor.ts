/**
 * Дескриптор ListItemCustom (TListItemCustom).
 */

import { defineComponent } from '../../base'
import { TListItemCustom } from '@soldy/core'
import { ListItemCustomContribution } from '../../../contributions'
import { ValueControlDescriptor } from '../value-control.descriptor'

export const ListItemCustomDescriptor = defineComponent({
	ctor: TListItemCustom,

	extends: ValueControlDescriptor,

	contribution: ListItemCustomContribution,
})
