import type { IContribution } from '@soldy/accessor'
import { PLUGIN_EVENTS } from '@soldy/plugins'
import type { TFramePlacement } from '@soldy/plugins'
import { defineType } from '../../defineType'

/**
 * Пропсы плагина в разметке — с неймспейсом.
 *
 * Нужен потому, что типы плагинных пропсов до шаблона не доходят:
 * `DescriptorProps` выводит только собственные пропсы компонента.
 */
export type TAnchorPluginProps = {
	anchor_anchor?: HTMLElement | null
	anchor_placement?: TFramePlacement
	anchor_matchWidth?: boolean
	anchor_offset?: number
}

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
			get: (plugin) => plugin.anchor,
			set: (plugin, value) => {
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
		offset: {
			type: Number,
			triggers: ['change:offset'],
		},
	},
})
