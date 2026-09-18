import { definePlugin } from '../../define'
import { TListItemPlugin, PLUGIN_EVENTS } from '@soldy/plugins'
import type { TListItemPluginEvents } from '@soldy/plugins'

/**
 * Плагин подсветки элемента списка (клавиатурная навигация).
 * Устанавливается на item-компоненте (ListBoxItem).
 */
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
