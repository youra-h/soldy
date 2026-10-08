/**
 * Определение TLocalePlugin (namespace `locale`) — язык приложения компоненту.
 *
 * Пропсов нет: язык задаёт приложение на всю библиотеку (`useLocale`), а не
 * разметка, — своего языка у компонента нет. Плагин пишет его в `locale`
 * владельца при установке и на каждую смену.
 *
 * Ставится только компонентам, которые читают язык: календарю, полю даты,
 * DatePicker и таблице.
 */

import { definePlugin } from '../../../protected/define'
import { TLocalePlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const LocalePluginDescriptor = definePlugin({
	ctor: TLocalePlugin,
	namespace: 'locale',
	contribution: { events: [...PLUGIN_EVENTS] },
})
