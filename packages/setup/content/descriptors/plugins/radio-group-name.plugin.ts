/**
 * Определение TRadioGroupNamePlugin (namespace `name`) — общий `name` радио
 * группы: свой у группы или `id` её монтирования.
 *
 * Пропсов нет: плагин пишет `name` каждому радио, а его разметка уже кладёт на
 * `<input>`.
 */

import { definePlugin } from '../../../protected/define'
import { TRadioGroupNamePlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const RadioGroupNamePluginDescriptor = definePlugin({
	ctor: TRadioGroupNamePlugin,
	namespace: 'name',
	contribution: { events: [...PLUGIN_EVENTS] },
})
