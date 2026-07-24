/**
 * Дескриптор List (TList).
 *
 * Наследование:
 * - ControlDescriptor (disabled, focused, size, variant, ...)
 *
 * Композиция:
 * - SelectableCollectionDescriptor → collection:* (items, mode, selected, events)
 */

import { defineComponent } from '../../base'
import { TList } from '@soldy/core'
import { ListContribution } from '../../../contributions'
import { ControlDescriptor } from '../control.descriptor'
import { SelectableCollectionDescriptor } from '../collection'

export const ListDescriptor = defineComponent({
	ctor: TList,

	extends: ControlDescriptor,

	contribution: ListContribution,

	composition: [{
		descriptor: SelectableCollectionDescriptor,
		get: (instance) => instance.collection,
	}],
})
