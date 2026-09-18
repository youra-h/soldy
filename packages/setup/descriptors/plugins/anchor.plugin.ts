import { definePlugin, defineType } from '../../define'
import { TAnchorPlugin, PLUGIN_EVENTS } from '@soldy/plugins'
import type {
	IAnchorPluginOptions,
	TAnchorPluginEvents,
	IAnchorPluginProps,
	TFramePlacement,
} from '@soldy/plugins'

/**
 * Привязка Frame к чужому элементу: `anchor_anchor`, `anchor_placement`,
 * `anchor_matchWidth`, `anchor_flip`, `anchor_offset`.
 *
 * Подключён к `FrameDescriptor`, то есть есть у каждого Frame. Без якоря
 * плагин ничего не делает и ни на что не подписан, поэтому диалогу по центру
 * или тосту в углу он не стоит ничего. Зато привязку можно задать в разметке
 * одним пропом — иначе пришлось бы доставать плагин из bundle.
 */
export const AnchorPluginDescriptor = (options?: IAnchorPluginOptions) =>
	definePlugin<'anchor', TAnchorPluginEvents, IAnchorPluginProps>({
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
		},
		options,
	})
