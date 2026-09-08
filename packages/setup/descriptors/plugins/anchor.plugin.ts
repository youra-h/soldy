import { definePlugin } from '../base'
import { TAnchorPlugin } from '@soldy/plugins'
import type { IAnchorPluginOptions, TAnchorPluginEvents } from '@soldy/plugins'
import { AnchorContribution } from '../../contributions'

/**
 * Привязка Frame к чужому элементу: `anchor_anchor`, `anchor_placement`,
 * `anchor_matchWidth`.
 *
 * Подключён к `FrameDescriptor`, то есть есть у каждого Frame. Без якоря
 * плагин ничего не делает и ни на что не подписан, поэтому диалогу по центру
 * или тосту в углу он не стоит ничего. Зато привязку можно задать в разметке
 * одним пропом — иначе пришлось бы доставать плагин из bundle.
 */
export const AnchorPluginDescriptor = (options?: IAnchorPluginOptions) =>
	definePlugin<'anchor', TAnchorPluginEvents>({
		ctor: TAnchorPlugin,
		namespace: 'anchor',
		contribution: AnchorContribution(),
		options,
	})
