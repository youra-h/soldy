/**
 * Определение TLocalePlugin (namespace `locale`) — язык монтирования
 * компоненту.
 *
 * Пропсов нет: язык знает место компонента в дереве — его задаёт провайдер
 * локали адаптера, — а не разметка. Плагин пишет тег локали поддерева в
 * `locale` владельца при установке и на каждую смену.
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
