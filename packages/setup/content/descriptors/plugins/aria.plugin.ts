/**
 * Определение TAriaPlugin (namespace `aria`) — доступное имя компонента.
 *
 * Пропсы — `aria_label`, `aria_labelledBy`, `aria_describedBy`.
 *
 * Подключается адресно, а не всем подряд. Подключён к ControlDescriptor —
 * у интерактивного элемента имя обязано быть всегда, это первое правило
 * доступности, и отдельно вспоминать про него для каждой новой кнопки нельзя.
 * Неинтерактивным (Icon, Spinner, Frame) добавляется поштучно там, где имя
 * осмысленно; Skeleton его не получает — заглушка декоративна.
 */

import { definePlugin } from '../../../protected/define'
import { TAriaPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

/**
 * Опция `role` (`AriaPluginDescriptor.with({ role: 'img' })`) — роль, которую
 * элемент принимает, получив имя. Нужна только там, где без имени он
 * декоративен (Icon).
 */
export const AriaPluginDescriptor = definePlugin({
	ctor: TAriaPlugin,
	namespace: 'aria',
	/**
	 * Единственный плагин, чьи пропсы пишутся снаружи, а не только читаются: имя
	 * задаёт потребитель, вычислить его неоткуда.
	 *
	 * Вычисленного набора здесь нет: плагин пишет свою часть в общий `aria`
	 * компонента, а тот уже объявлен в `ComponentViewDescriptor`. Отдельный
	 * `aria_attributes` заставлял бы разметку складывать два набора спредом — от
	 * этого и уходили.
	 */
	contribution: {
		events: [...PLUGIN_EVENTS],
		props: {
			label: { type: String, triggers: ['change:label'] },
			labelledBy: { type: String, triggers: ['change:labelledBy'] },
			describedBy: { type: String, triggers: ['change:describedBy'] },
		},
	},
})
