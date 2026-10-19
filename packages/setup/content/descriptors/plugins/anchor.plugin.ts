/**
 * Определение TAnchorPlugin (namespace `anchor`) — привязка Frame к чужому элементу.
 *
 * Пропсы — `anchor_anchor`, `anchor_point`, `anchor_placement`,
 * `anchor_matchWidth`, `anchor_flip`, `anchor_offset`. Подключён к
 * `FrameDescriptor`, то есть есть у каждого Frame. Без якоря и точки плагин
 * ничего не делает и ни на что не подписан, поэтому диалогу по центру или
 * тосту в углу он не стоит ничего. Зато привязку можно задать в разметке одним
 * пропом — иначе пришлось бы доставать плагин из bundle.
 */

import { definePlugin } from '../../../protected/define'
import { TAnchorPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const AnchorPluginDescriptor = definePlugin({
	ctor: TAnchorPlugin,
	namespace: 'anchor',
	/**
	 * Якорь пишется снаружи: элемент, у которого встаёт панель, знает только
	 * разметка. Раньше привязку можно было задать лишь достав плагин из bundle —
	 * то есть выпадающую панель нельзя было собрать декларативно.
	 *
	 * Записывается через `set`, а не присваиванием: у плагина это `setAnchor()` и
	 * `removeAnchor()` — две операции вместо одного поля.
	 */
	contribution: {
		events: [...PLUGIN_EVENTS],
		props: {
			anchor: {
				type: Object,
				triggers: ['change:anchor'],
				get: (plugin: TAnchorPlugin) => plugin.anchor,
				set: (plugin: TAnchorPlugin, value: Element | null) => {
					if (value) {
						plugin.setAnchor(value)
					} else {
						plugin.removeAnchor()
					}
				},
			},
			/**
			 * Точка в координатах окна вместо якоря — главнее него, пока задана:
			 * контекстное меню встаёт у места вызова. Знает её тот, кто панель
			 * открыл, поэтому и она пишется снаружи.
			 */
			point: {
				type: Object,
				triggers: ['change:point'],
			},
			placement: {
				type: String,
				triggers: ['change:placement'],
			},
			matchWidth: {
				type: Boolean,
				triggers: ['change:matchWidth'],
			},
			flip: {
				type: Boolean,
				triggers: ['change:flip'],
			},
			offset: {
				type: Number,
				triggers: ['change:offset'],
			},
		},
	},
})
