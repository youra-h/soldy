/**
 * Дескриптор ListItem (TListItem).
 *
 * Наследование:
 * - ListItemCustomDescriptor (tag, text, wordWrap, value, name, ...)
 *
 * Композиция:
 * - SelectableCollectionItemDescriptor → collection:* (selected)
 */

import { defineComponent } from '../../base'
import { TListItem } from '@soldy/core'
import { ListItemContribution } from '../../../contributions'
import { ListItemCustomDescriptor } from './list-item-custom.descriptor'
import { SelectableCollectionItemDescriptor } from '../collection'

export const ListItemDescriptor = defineComponent({
	ctor: TListItem,

	extends: ListItemCustomDescriptor,

	contribution: ListItemContribution,

	composition: [{
		descriptor: SelectableCollectionItemDescriptor,
		get: (instance) => instance.collectionItem,
	}],
})
