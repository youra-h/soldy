/**
 * Дескриптор TableColumn (TTableColumn) — заголовок колонки таблицы.
 *
 * Наследует `ComponentViewDescriptor`, а не `ControlDescriptor`: нажатия,
 * фокуса и имени у заголовка нет, а `disabled` колонке пишет таблица — для
 * ручки ширины. Колонку рисует таблица — по заголовку на показанную колонку,
 * над её экземпляром (`ctrl`), как Calendar рисует день, — а колонки задаются
 * только данными (`columns`). Поэтому входов у части нет: всё своё у колонки
 * объявлено защищённым и только читается.
 *
 * Корень — ячейка шапки (`th`), на ней наборы колонки (`aria-sort`,
 * `aria-labelledby`, `data-sort`, `data-sort-priority`, `data-align`,
 * `data-sized` — ширина известна, своя или раскладки, — `data-resizing`,
 * `data-reorderable`, а в жесте перестановки — `data-dragging` и `data-drop`)
 * и ширина переменной (`widthStyle`). Ширину колонки без своей ширины
 * раскладывает таблица — расширение колонок по месту, которое мерит плагин
 * раскладки таблицы. Перестановку ведёт плагин таблицы, а не колонки: место
 * колонки знает коллекция колонок.
 * Содержимое — слот по умолчанию в обёртке с набором `contentAria`: его
 * наполняет таблица — кнопкой сортировки или текстом. За обёрткой — ручка
 * ширины (`resizerRendered`): поле с ходом и шириной (`resizer`) и набором
 * `resizerAria`.
 *
 * Плагин связок называет заголовок и поле ручки обёрткой содержимого, плагин
 * ручки ведёт указатель и клавиши.
 */

import { defineComponent, defineDescriptor, defineType } from '../../../../protected/define'
import { TTableColumn } from '@soldy-ui/core'
import { ComponentViewDescriptor } from '../component-view.descriptor'
import { TableColumnIdsPluginDescriptor, TableColumnResizePluginDescriptor } from '../../plugins'

export const TableColumnDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TTableColumn,

		extends: ComponentViewDescriptor(),

		contribution: {
			slots: {
				default: {
					scope: {
						text: defineType<string>(String),
						sortable: defineType<boolean>(Boolean),
					},
					description: 'Содержимое заголовка. Без него — текст колонки',
				},
			},
			props: {
				field: { type: String, protected: true, triggers: ['change:field'] },
				text: { type: String, protected: true, triggers: ['change:text'] },
				width: { type: Number, protected: true, triggers: ['change:width'] },
				minWidth: { type: Number, protected: true, triggers: ['change:minWidth'] },
				maxWidth: { type: Number, protected: true, triggers: ['change:maxWidth'] },
				align: { type: String, protected: true, triggers: ['change:align'] },
				sortable: { type: Boolean, protected: true, triggers: ['change:sortable'] },
				compare: { type: Function, protected: true, triggers: ['change:compare'] },
				rowHeader: { type: Boolean, protected: true, triggers: ['change:rowHeader'] },
				resizable: { type: Boolean, protected: true, triggers: ['change:resizable'] },
				reorderable: { type: Boolean, protected: true, triggers: ['change:reorderable'] },
				disabled: { type: Boolean, protected: true, triggers: ['change:disabled'] },
				/**
				 * Ширина колонки — `--s-table-column-width`. Считает ядро: в шести
				 * адаптерах одна формула была бы шесть раз.
				 */
				widthStyle: { type: Object, protected: true, triggers: ['change:width'] },
				/**
				 * Рисовать ли ручку ширины: колонка `resizable`, не выключена, и
				 * ширина известна — своя или раскладки. Формулу считает ядро —
				 * разметка без экземпляра её не повторяет.
				 */
				resizerRendered: {
					type: Boolean,
					protected: true,
					triggers: ['change:resizerRendered'],
				},
				/**
				 * Поле ручки: ход и ширина в px. Своего экземпляра у ручки нет —
				 * поле отдаётся значением, как ручки Slider.
				 */
				resizer: { type: Object, protected: true, triggers: ['change:resizer'] },
				/**
				 * Атрибуты поля ручки и обёртки содержимого. Наборы колонки, а не
				 * свои: у разметки без компонента экземпляра нет.
				 */
				resizerAria: { type: Object, protected: true, triggers: ['change:resizerAria'] },
				contentAria: { type: Object, protected: true, triggers: ['change:contentAria'] },
			},
		},

		plugins: [
			// Имя заголовка и поля ручки — обёртка содержимого заголовка
			TableColumnIdsPluginDescriptor,
			// Ручка ширины: указатель, клавиши и жест скринридера
			TableColumnResizePluginDescriptor,
		],
	}),
)
