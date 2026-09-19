/**
 * Определение TListItemPlugin (namespace `listItem`) — подсветка элемента списка.
 *
 * Клавиатурная навигация: устанавливается на item-компоненте (ListBoxItem,
 * SelectItem), выход — `listItem_highlighted`.
 */

import { definePlugin } from '../../define'
import { TListItemPlugin, PLUGIN_EVENTS } from '@soldy/plugins'

export const ListItemPluginDescriptor = () =>
	definePlugin({
		ctor: TListItemPlugin,
		namespace: 'listItem',
		contribution: {
			events: [...PLUGIN_EVENTS],
			props: {
				highlighted: {
					protected: true,
					triggers: ['change:highlighted'],
				},
			},
		},
	})
