import type { IContribution } from '@soldy/accessor'
import { PLUGIN_EVENTS } from '@soldy/plugins'
import type { TAnchorPlugin, TFramePlacement } from '@soldy/plugins'
import { defineType } from '../../defineType'

/**
 * Якорь пишется снаружи: элемент, у которого встаёт панель, знает только
 * разметка. Раньше привязку можно было задать лишь достав плагин из bundle —
 * то есть выпадающую панель нельзя было собрать декларативно.
 *
 * Записывается через `set`, а не присваиванием: у плагина это `setAnchor()` и
 * `removeAnchor()` — две операции вместо одного поля.
 */
export const AnchorContribution = (): IContribution => ({
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
		placement: {
			type: defineType<TFramePlacement>(String),
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
})
