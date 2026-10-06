/**
 * Определение TSwipePlugin (namespace `swipe`) — жест слоя: смахнуть панель,
 * чтобы закрыть. Ставят его слои, которые смахивают: выезжающая панель,
 * поповер и панели Select и DatePicker.
 *
 * Своих пропсов и выходов у плагина нет: за что тянуть, выбирает проп
 * компонента `swipe`, признак «тянут» и закрытие видны через владельца, а
 * сдвиг во время жеста — операция над узлом, и через обмен он не ходит.
 * Открытость плагин ведёт сам, как другие плагины слоя: по умолчанию `open`,
 * у модального слоя — `property: 'visible'`.
 */

import { definePlugin } from '../../../protected/define'
import { TSwipePlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const SwipePluginDescriptor = definePlugin({
	ctor: TSwipePlugin,
	namespace: 'swipe',
	contribution: { events: [...PLUGIN_EVENTS] },
})
