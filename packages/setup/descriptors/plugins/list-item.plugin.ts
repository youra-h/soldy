/**
 * Определение TListItemPlugin (namespace `listItem`) — подсветка элемента списка.
 *
 * Клавиатурная навигация: устанавливается на item-компоненте (ListBoxItem,
 * SelectItem), выход — `listItem_highlighted`.
 */

import { definePlugin } from '../../define'
import { TListItemPlugin, PLUGIN_EVENTS } from '@soldy/plugins'
import type { TListItemPluginEvents } from '@soldy/plugins'

export const ListItemPluginDescriptor = () =>
	definePlugin<'listItem', TListItemPluginEvents, object, Pick<TListItemPlugin, 'highlighted'>>({
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
