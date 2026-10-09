/**
 * Дескриптор TableRow (TTableRow) — строка таблицы.
 *
 * Наследует `StylableDescriptor`, а не `ControlDescriptor`, как день
 * календаря: плагины Control строке не подходят. `TActionPlugin` дал бы
 * строке нажатие, хотя в роли `table` нажатие по строке ничего не делает —
 * выбирают чекбоксом, — а `TAriaPlugin` — имя, которое строке не нужно: её
 * называет заголовок строки.
 *
 * Строку рисует таблица — по строке на показанную, над её экземпляром
 * (`ctrl`), — а строки задаются только данными (`items`). Входов у строки нет:
 * запись, «выключена», размер и вариант кладут в неё данные и таблица, и всё
 * это только читается, поэтому объявлено защищённым.
 *
 * Плагин связок пишет `id` заголовка строки в её набор `headerAria`: на него
 * ссылается имя чекбокса выбора строки.
 */

import { defineComponent, defineDescriptor, defineType } from '../../../../protected/define'
import { TTableRow } from '@soldy-ui/core'
import type { ITableColumn, ITableRow } from '@soldy-ui/core'
import { OWNER_STYLE_PROPS, StylableDescriptor } from '../stylable.descriptor'
import { TableRowIdsPluginDescriptor } from '../../plugins'

export const TableRowDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TTableRow,

		extends: StylableDescriptor(),

		contribution: {
			slots: {
				/**
				 * Ячейка строки — scope слота `cell` таблицы: строку в него кладёт
				 * сама строка, и таблица отдаёт в него свой слот как есть, ничего не
				 * добавляя.
				 */
				cell: {
					scope: {
						row: defineType<ITableRow>(Object),
						column: defineType<ITableColumn>(Object),
						value: defineType<unknown>(Object),
					},
					description: 'Содержимое ячейки. Без него — значение текстом',
				},
			},
			props: {
				// Размер и вариант строки — таблицы: входы сняты
				...OWNER_STYLE_PROPS,
				disabled: { type: Boolean, protected: true, triggers: ['change:disabled'] },
				focused: { type: Boolean, protected: true, triggers: ['change:focused'] },
				data: { type: Object, protected: true, triggers: ['change:data'] },
				/**
				 * Атрибуты заголовка строки. Набор строки, а не свой: ячейка —
				 * разметка строки, экземпляра у неё нет.
				 */
				headerAria: { type: Object, protected: true, triggers: ['change:headerAria'] },
			},
		},

		plugins: [
			// Имя строки: `id` её заголовка, на который ссылается чекбокс выбора
			TableRowIdsPluginDescriptor,
		],
	}),
)
