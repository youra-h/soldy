/**
 * Определение TActionPlugin (namespace `action`) — взаимодействие с пользователем.
 *
 * Подключён к ControlDescriptor: DOM-события и фокус нужны интерактивным
 * компонентам, а Frame/Icon/Skeleton наследуются от ComponentView/Stylable и
 * лишнего не получают.
 */

import { definePlugin } from '../../define'
import { TActionPlugin, PLUGIN_EVENTS } from '@soldy/plugins'

export const ActionPluginDescriptor = definePlugin({
	ctor: TActionPlugin,
	namespace: 'action',
	/**
	 * `press` — нормализованная активация (клик или Enter/Space, не приходит на
	 * disabled), `click` — сырой DOM-клик как есть. Оба нужны: первое одинаково
	 * работает на любом теге, второе даёт правду для стороны инстанса.
	 */
	contribution: {
		events: [...PLUGIN_EVENTS, 'press', 'click', 'focus', 'blur'],
	},
})
