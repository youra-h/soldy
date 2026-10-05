/**
 * Дескриптор TableColumn (TTableColumn) — заголовок колонки таблицы.
 *
 * Наследует `ComponentViewDescriptor`: своего `disabled` у заголовка нет.
 * Колонку рисует таблица — по заголовку на показанную колонку, над её
 * экземпляром (`ctrl`), как Calendar рисует день, — а колонки задаются только
 * данными (`columns`). Поэтому входов у части нет: всё своё у колонки
 * объявлено защищённым и только читается.
 *
 * Корень — ячейка шапки (`th`), на ней наборы колонки (`aria-sort`,
 * `data-sort`, `data-sort-priority`, `data-align`) и ширина переменной
 * (`widthStyle`). Содержимое — слот по умолчанию: его наполняет таблица —
 * кнопкой сортировки или текстом.
 */

import { defineComponent, defineDescriptor, defineType } from '../../../../protected/define'
import { TTableColumn } from '@soldy-ui/core'
import { ComponentViewDescriptor } from '../component-view.descriptor'

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
				/**
				 * Ширина колонки — `--s-table-column-width`. Считает ядро: в шести
				 * адаптерах одна формула была бы шесть раз.
				 */
				widthStyle: { type: Object, protected: true, triggers: ['change:width'] },
			},
		},
	}),
)
