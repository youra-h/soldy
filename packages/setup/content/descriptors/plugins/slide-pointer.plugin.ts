/**
 * Определение TSlidePointerPlugin (namespace `pointer`) — указатель перетаскивания.
 *
 * Переводит нажатие и протяжку в доли хода и зовёт команды владельца
 * (`ISlidable`), а щелчок к меткам — стратегией по режиму владельца. Своих
 * пропсов и выходов у плагина нет: режим и радиус щелчка — пропсы владельца,
 * а всё, что видно снаружи, — его значение и состояние. Стоянку ручки на
 * метке в режиме `hold` задаёт опция установки:
 * `SlidePointerPluginDescriptor.with({ holdDelay: 400 })`.
 */

import { definePlugin } from '../../../protected/define'
import { TSlidePointerPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const SlidePointerPluginDescriptor = definePlugin({
	ctor: TSlidePointerPlugin,
	namespace: 'pointer',
	contribution: { events: [...PLUGIN_EVENTS] },
})
