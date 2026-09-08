import { definePlugin } from '../base'
import { TDismissPlugin } from '@soldy/plugins'
import type { IDismissPluginOptions, TDismissPluginEvents } from '@soldy/plugins'
import { DismissContribution } from '../../contributions'

/**
 * «Нажали мимо» — общий слой для всего, что открывается поверх страницы:
 * Select, Menu, Popover, Tooltip.
 *
 * Подключается адресно, а не к `ControlDescriptor`: у обычной кнопки или поля
 * закрывать нечего, а глобальный слушатель на документе стоил бы на каждом
 * контроле страницы.
 */
export const DismissPluginDescriptor = (options?: IDismissPluginOptions) =>
	definePlugin<'dismiss', TDismissPluginEvents>({
		ctor: TDismissPlugin,
		namespace: 'dismiss',
		contribution: DismissContribution(),
		options,
	})
