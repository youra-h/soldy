/**
 * Определение TDismissPlugin (namespace `dismiss`) — «нажали мимо».
 *
 * Общий слой для всего, что открывается поверх страницы: Select, Menu, Popover,
 * Tooltip. Подключается адресно, а не к `ControlDescriptor`: у обычной кнопки или
 * поля закрывать нечего, а глобальный слушатель на документе стоил бы на каждом
 * контроле страницы.
 *
 * Оба пропа типизирует класс плагина: вход `dismiss_enabled` и выход
 * `dismiss_ownerAttribute` — его одноимённые свойства, `definePlugin` выводит
 * их типы сам. Выход шаблон Select раскладывает спредом на телепортированную
 * панель, а спреду нужен объектный тип.
 */

import { definePlugin } from '../../define'
import { TDismissPlugin, PLUGIN_EVENTS } from '@soldy/plugins'
import type { IDismissPluginOptions } from '@soldy/plugins'

export const DismissPluginDescriptor = (options?: IDismissPluginOptions) =>
	definePlugin({
		ctor: TDismissPlugin,
		namespace: 'dismiss',
		/**
		 * `enabled` пишется снаружи: пока панель закрыта, глобальный слушатель не
		 * нужен. `ownerAttribute` — вычисляемый: разметка вешает его на
		 * телепортированную панель, чтобы нажатие внутри неё не считалось нажатием
		 * мимо.
		 *
		 * Событие `dismiss` выведено наружу: закрывать или нет — решает потребитель,
		 * плагин только сообщает.
		 */
		contribution: {
			events: [...PLUGIN_EVENTS, 'dismiss'],
			props: {
				enabled: { type: Boolean, triggers: ['change:enabled'] },
				/**
				 * Значение постоянное — строится из `uid` владельца. Триггер всё равно
				 * нужен: проп без триггеров адаптер считает pass-through и наружу не
				 * отдаёт. `create` — момент, когда плагин объявлен готовым.
				 */
				ownerAttribute: { type: Object, protected: true, triggers: ['create'] },
			},
		},
		options,
	})
