/**
 * Определение TTranslationsPlugin (namespace `translations`) — словарь
 * приложения компоненту.
 *
 * Пропсов нет: строки библиотеки задаёт приложение на всю библиотеку
 * (`useTranslations`), а не разметка, — своих строк у компонента нет. Плагин
 * пишет словарь в `translations` владельца при установке и на каждую смену, а
 * разметка получает готовые имена — выходы компонента.
 *
 * Ставится только компонентам, которые читают словарь: модальному слою,
 * поповеру, элементам табов и тегов, тегам, ленте, полю, таблице, календарю и
 * DatePicker.
 */

import { definePlugin } from '../../../protected/define'
import { TTranslationsPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const TranslationsPluginDescriptor = definePlugin({
	ctor: TTranslationsPlugin,
	namespace: 'translations',
	contribution: { events: [...PLUGIN_EVENTS] },
})
