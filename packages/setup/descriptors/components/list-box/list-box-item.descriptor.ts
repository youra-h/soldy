/**
 * Дескриптор ListBoxItem (TListBoxItem).
 *
 * Наследует ListItemDescriptor (text, wordWrap, selected, value, name, ...)
 * и добавляет плагин подсветки элемента (клавиатурная навигация).
 */

import { defineComponent } from '../../base'
import { TListBoxItem } from '@soldy/core'
import type { IListBoxItemProps, TListBoxItemEvents } from '@soldy/core'
import { ListBoxItemContribution } from '../../../contributions'
import { ListItemDescriptor } from '../list'
import { ListItemPluginDescriptor } from '../../plugins'

export const ListBoxItemDescriptor = () =>
	defineComponent<IListBoxItemProps, TListBoxItemEvents>()({
		ctor: TListBoxItem,

		extends: ListItemDescriptor(),

		contribution: ListBoxItemContribution(),

		plugins: [ListItemPluginDescriptor()],
	})
