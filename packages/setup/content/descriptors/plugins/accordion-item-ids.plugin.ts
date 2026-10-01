/**
 * Определение TAccordionItemIdsPlugin (namespace `ids`) — связка «заголовок ↔
 * панель» секции Accordion в документе: `id` обеих и ссылки между ними.
 *
 * Пропсов нет: плагин пишет в наборы секции (`aria`, `contentAria`), а их
 * разметка уже раскладывает.
 */

import { definePlugin } from '../../../protected/define'
import { TAccordionItemIdsPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const AccordionItemIdsPluginDescriptor = definePlugin({
	ctor: TAccordionItemIdsPlugin,
	namespace: 'ids',
	contribution: { events: [...PLUGIN_EVENTS] },
})
