import { definePlugin } from '../base'
import { TListLayoutPlugin } from '@soldy/plugins'
import type { TListLayoutPluginEvents } from '@soldy/plugins'
import { ListLayoutPluginContribution } from '../../contributions'

/**
 * Раскладка списка: `maxRows`, `wordWrap`, `autoWidth`, `scrollBehavior`.
 *
 * `flatProps` — свойства выходят наружу без префикса: для потребителя
 * `<ListBox max-rows="5">` неотличим от собственного пропа компонента. Так их
 * получает любой компонент, подключивший плагин, — включая Select, который
 * списком не является и наследоваться от него не может.
 *
 * События префикс сохраняют (`layout:create`): `create` есть у каждого
 * плагина, и без него два плагина на одном компоненте эмитили бы неразличимое
 * событие.
 */
export const ListLayoutPluginDescriptor = () =>
	definePlugin<'layout', TListLayoutPluginEvents>({
		ctor: TListLayoutPlugin,
		namespace: 'layout',
		flatProps: true,
		contribution: ListLayoutPluginContribution(),
	})
