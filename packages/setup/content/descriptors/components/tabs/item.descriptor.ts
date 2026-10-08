/**
 * Дескриптор TabsItem.
 *
 * Наследует ValueControlDescriptor (value, name, disabled, focused, size, variant, ...)
 * и добавляет tag, text, closable, слоты строки и крестика + коллекционный плагин (active, order).
 * Имя крестика — строка словаря приложения с текстом таба: словарь пишет
 * плагин словаря.
 */

import { defineComponent, defineDescriptor, defineType } from '../../../../protected/define'
import { TTabsItem } from '@soldy-ui/core'
import { ValueControlDescriptor } from '../value-control.descriptor'
import { OWNER_STYLE_PROPS } from '../stylable.descriptor'
import { TabsItemIdsPluginDescriptor, TranslationsPluginDescriptor } from '../../plugins'

export const TabsItemDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TTabsItem,

		extends: ValueControlDescriptor(),

		contribution: {
			// Слоты строки те же, что у элементов остальных коллекций: перед текстом,
			// текст, после текста. Строку рисует один и тот же `Button`
			slots: {
				leading: { description: 'Перед текстом таба' },
				default: {
					scope: {
						text: defineType<string>(String),
						active: defineType<boolean>(Boolean),
					},
					description: 'Содержимое таба. Задано — переопределяет проп text',
				},
				trailing: { description: 'После текста таба' },
				// Подмена иконки закрытия в одном месте; по умолчанию она берётся из
				// пакета иконок по роли `close` (см. `ICON_ROLES`)
				'close-icon': { description: 'Иконка кнопки закрытия' },
			},
			props: {
				// Размер и вид таба задаёт набор: входы сняты
				...OWNER_STYLE_PROPS,
				text: { type: String, triggers: ['change:text'] },
				closable: { type: Boolean, triggers: ['change:closable'] },
				/**
				 * Имя кнопки закрытия — строка словаря с текстом таба. Отдельный
				 * набор, а не часть `aria`: `aria` описывает сам таб, а это кнопка
				 * рядом с ним.
				 */
				closeAria: {
					type: Object,
					protected: true,
					triggers: ['change:translations', 'change:text'],
				},
			},
		},

		plugins: [
			// Словарь приложения: имя крестика — с первой отрисовки
			TranslationsPluginDescriptor,
			// Связка «таб ↔ панель»: `id` таба и `aria-controls` его панели
			TabsItemIdsPluginDescriptor,
		],
	}),
)
