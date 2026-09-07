/**
 * Дескриптор ListItem (TListItem).
 *
 * Наследует ValueControlDescriptor (value, name, disabled, focused, size, variant, ...)
 * и добавляет text, wordWrap + коллекционные item-пропсы (selected, order).
 */

import { defineComponent } from '../../base'
import { TListItem } from '@soldy/core'
import { ListItemContribution } from '../../../contributions'
import { ValueControlDescriptor } from '../value-control.descriptor'

export const ListItemDescriptor = () =>
	defineComponent({
		ctor: TListItem,

		extends: ValueControlDescriptor(),

		contribution: ListItemContribution(),
	})
