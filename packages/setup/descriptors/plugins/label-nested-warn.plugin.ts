/**
 * Определение TLabelNestedWarnPlugin (namespace `nestedWarn`) — диагностика вложенного `label`.
 *
 * Предупреждает, если внутри корня-`label` подписи Label оказался другой
 * `label` — обычно радио без tag="span".
 */

import { definePlugin } from '../../define'
import { TLabelNestedWarnPlugin, PLUGIN_EVENTS } from '@soldy/plugins'

export const LabelNestedWarnPluginDescriptor = definePlugin({
	ctor: TLabelNestedWarnPlugin,
	namespace: 'nestedWarn',
	contribution: { events: [...PLUGIN_EVENTS] },
})
