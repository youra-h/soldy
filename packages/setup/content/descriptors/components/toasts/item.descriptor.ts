/**
 * Дескриптор тоста (TToastsItem).
 *
 * Наследует `ComponentViewDescriptor`: ни размера, ни варианта у тоста нет —
 * что случилось, говорит вид сообщения (`type`), а не цвет темы. Добавляет
 * текст, описание, вид, ожидание, кнопку закрытия, длительность, срочность,
 * своё содержимое (`render`) и набор `closeAria`.
 *
 * Тост приходит из кода (`show`), а не из разметки: частью `Toasts.Item` он
 * не стал (см. «Часть или слот»), и его рисует только регион владельца.
 *
 * Слотов описания нет: имя совпало бы с пропом `description`. Описание —
 * текстом пропа, а разметку кладут в `content`.
 */

import { defineComponent, defineDescriptor, defineType } from '../../../../protected/define'
import { TToastsItem } from '@soldy-ui/core'
import type { TToastsItemType } from '@soldy-ui/core'
import { ComponentViewDescriptor } from '../component-view.descriptor'
import { SwipePluginDescriptor, ToastsItemNamesPluginDescriptor } from '../../plugins'

export const ToastsItemDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TToastsItem,

		extends: ComponentViewDescriptor(),

		contribution: {
			slots: {
				// Подмена значка вида в одном месте; по умолчанию он берётся из пакета
				// иконок по роли вида (см. `ICON_ROLES`). Пока тост ждёт, на месте
				// значка кольцо — и на месте значка из слота тоже
				icon: {
					scope: { type: defineType<TToastsItemType | undefined>(String) },
					description:
						'Значок тоста — перед текстом. Без слота — значок вида; пока тост ждёт — кольцо',
				},
				default: {
					scope: { text: defineType<string>(String) },
					description: 'Текст тоста. Задано — переопределяет проп text',
				},
				content: {
					description: 'Своё содержимое под текстом. Без слота — render тоста',
				},
				// Подмена иконки закрытия в одном месте; по умолчанию она берётся из
				// пакета иконок по роли `close` (см. `ICON_ROLES`)
				'close-icon': { description: 'Иконка кнопки закрытия' },
			},
			props: {
				text: { type: String, triggers: ['change:text'] },
				description: { type: String, triggers: ['change:description'] },
				/**
				 * Вид сообщения: модификатор `--type-<v>` и значок вида. Union ядра, а
				 * не значение темы: значок по нему выбирает разметка
				 */
				type: { type: String, triggers: ['change:type'] },
				/** Тост ждёт: на месте значка кольцо, и сам тост не закрывается */
				loading: { type: Boolean, triggers: ['change:loading'] },
				closable: { type: Boolean, triggers: ['change:closable'] },
				duration: { type: Number, triggers: ['change:duration'] },
				alert: { type: Boolean, triggers: ['change:alert'] },
				/**
				 * Своё содержимое под текстом. Ядро значение не читает: что это и как
				 * его нарисовать, знает адаптер (во Vue — компонент с пропом `toast`)
				 */
				render: { type: [Object, Function], triggers: ['change:render'] },
				/**
				 * Атрибуты кнопки закрытия. Отдельный набор, а не часть `aria`: `aria`
				 * описывает тост, а это кнопка в нём. Имя от локали пишет плагин имён,
				 * и триггер один — набор сам сообщает, что изменился.
				 */
				closeAria: {
					type: Object,
					protected: true,
					triggers: ['change:closeAria'],
				},
			},
		},

		plugins: [
			// Имя крестика от локали, вместе с текстом тоста — с первой отрисовки
			ToastsItemNamesPluginDescriptor,
			// Смахнуть тост к стороне его места. Открытость тоста — `open`
			SwipePluginDescriptor,
		],
	}),
)
