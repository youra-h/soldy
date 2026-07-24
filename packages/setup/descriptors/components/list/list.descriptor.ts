/**
 * Дескриптор List (TList).
 *
 * Множественное наследование:
 * - ControlDescriptor (disabled, focused, size, variant, ...)
 * - SelectableCollectionDescriptor (items, mode, selected, events: item:selected/...)
 */

import { defineComponent } from '../../base'
import { TList } from '@soldy/core'
import { ListContribution } from '../../../contributions'
import { ControlDescriptor } from '../control.descriptor'
import { SelectableCollectionDescriptor } from '../collection'

export const ListDescriptor = defineComponent({
	ctor: TList,

	extends: [ControlDescriptor, SelectableCollectionDescriptor],

	contribution: ListContribution,
})
