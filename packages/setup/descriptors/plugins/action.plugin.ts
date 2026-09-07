import { definePlugin } from '../base'
import { TActionPlugin } from '@soldy/plugins'
import type { TActionPluginEvents } from '@soldy/plugins'
import { ActionContribution } from '../../contributions'

/**
 * Плагин взаимодействия с пользователем. Подключён к ControlDescriptor:
 * DOM-события и фокус нужны интерактивным компонентам, а Frame/Icon/Skeleton
 * наследуются от ComponentView/Stylable и лишнего не получают.
 */
export const ActionPluginDescriptor = () =>
	definePlugin<'action', TActionPluginEvents>({
		ctor: TActionPlugin,
		namespace: 'action',
		contribution: ActionContribution(),
	})
