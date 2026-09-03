import { definePlugin } from '../base'
import { TListItemPlugin } from '@soldy/plugins'
import type { TListItemPluginEvents } from '@soldy/plugins'
import { ListItemPluginContribution } from '../../contributions'

/**
 * Плагин подсветки элемента списка (клавиатурная навигация).
 * Устанавливается на item-компоненте (ListBoxItem).
 */
export const ListItemPluginDescriptor = () =>
	definePlugin<'listItem', TListItemPluginEvents>({
		ctor: TListItemPlugin,
		namespace: 'listItem',
		contribution: ListItemPluginContribution(),
	})
