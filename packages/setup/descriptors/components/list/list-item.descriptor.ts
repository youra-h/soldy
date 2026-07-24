/**
 * Дескриптор ListItem (TListItem).
 *
 * Множественное наследование:
 * - ListItemCustomDescriptor (tag, text, wordWrap, value, name, ...)
 * - SelectableCollectionItemDescriptor (selected)
 */

import { defineComponent } from '../../base'
import { TListItem } from '@soldy/core'
import { ListItemContribution } from '../../../contributions'
import { ListItemCustomDescriptor } from './list-item-custom.descriptor'
import { SelectableCollectionItemDescriptor } from '../collection'

export const ListItemDescriptor = defineComponent({
	ctor: TListItem,

	extends: [ListItemCustomDescriptor, SelectableCollectionItemDescriptor],

	contribution: ListItemContribution,
})
