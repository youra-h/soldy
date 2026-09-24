/**
 * Определение TSlidePointerPlugin (namespace `pointer`) — указатель перетаскивания.
 *
 * Переводит нажатие и протяжку в доли хода и зовёт команды владельца
 * (`ISlidable`). Своих пропсов и выходов у плагина нет: всё, что видно
 * снаружи, — значение и состояние владельца.
 */

import { definePlugin } from '../../../protected/define'
import { TSlidePointerPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const SlidePointerPluginDescriptor = definePlugin({
	ctor: TSlidePointerPlugin,
	namespace: 'pointer',
	contribution: { events: [...PLUGIN_EVENTS] },
})
