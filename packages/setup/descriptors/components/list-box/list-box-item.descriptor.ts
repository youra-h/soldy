/**
 * Дескриптор ListBoxItem (TListBoxItem).
 *
 * Наследует ListItemDescriptor (tag, text, wordWrap, selected, value, name, ...)
 * и добавляет view + плагин ListItem.
 */

import { defineComponent, definePlugin } from '../../base'
import { TListBoxItem } from '@soldy/core'
import { TListItemPlugin } from '@soldy/plugins'
import { ListBoxItemContribution, ListItemPluginContribution } from '../../../contributions'
import { ListItemDescriptor } from '../list'

export const ListBoxItemDescriptor = defineComponent({
	ctor: TListBoxItem,

	extends: ListItemDescriptor,

	contribution: ListBoxItemContribution,

	plugins: [
		definePlugin({
			ctor: TListItemPlugin,
			contribution: ListItemPluginContribution,
		}),
	],
})
