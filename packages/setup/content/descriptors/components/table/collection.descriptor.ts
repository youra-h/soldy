/**
 * Дескрипторы коллекционной части Table — фасады таблицы и строки.
 *
 * Членство в коллекции отделено от собственных пропсов компонента
 * (`TableDescriptor`, `TableRowDescriptor`): адаптер собирает компонент из
 * обоих рантайм-списков.
 */

import { defineComponent, defineDescriptor } from '../../../../protected/define'
import { TTableCollectionFacade, TTableRowCollectionFacade } from '@soldy-ui/core'
import { CollectionDescriptor } from '../collection'

export const TableCollectionDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TTableCollectionFacade,

		extends: CollectionDescriptor(),

		/**
		 * Коллекционные props таблицы — то, что выводит фасад
		 * `TTableCollectionFacade`: режим выбора строк, колонки данными,
		 * сортировка, режимы сетки и окна; выходы — колонки, выбор, набор ячейки
		 * выбора и строки шапки и что рисует тело; события — ширина и место, которые пользователь задал
		 * колонке.
		 */
		contribution: {
			props: {
				/** Режим выбора строк. `none` (по умолчанию) — колонки выбора нет */
				mode: { type: String, triggers: ['change:mode'] },
				/**
				 * Колонки данными: сверка по `field`. Читаются экземпляры колонок,
				 * пишутся данные — как `items` у строк
				 */
				columns: { type: Array, triggers: ['change:shownColumns'] },
				sort: { type: Array, triggers: ['change:sort'] },
				sortMode: { type: String, triggers: ['change:sortMode'] },
				presorted: { type: Boolean, triggers: ['change:presorted'] },
				/**
				 * Режим сетки (APG Data Grid): одна остановка Tab, стрелки по
				 * ячейкам, строку выбирают нажатием и пробелом
				 */
				grid: { type: Boolean, triggers: ['change:grid'] },
				/**
				 * Режим окна: тело рисует только видимые строки с запасом,
				 * остальные — распорками той же высоты
				 */
				virtual: { type: Boolean, triggers: ['change:virtual'] },
				/**
				 * Что рисует тело по порядку: строки и, в режиме окна, распорки на
				 * месте пропущенных. Без режима — все показанные строки
				 */
				bodyRows: { type: Array, protected: true, triggers: ['change:bodyRows'] },
				/** Набор строки шапки — у неё нет экземпляра. В режиме окна — её номер */
				headRowAria: { type: Object, protected: true, triggers: ['change:headRowAria'] },
				/**
				 * Набор ячейки колонки выбора в шапке — у неё нет экземпляра. В сетке
				 * ячейка принимает фокус, вне сетки набор пуст.
				 */
				cellAria: { type: Object, protected: true, triggers: ['change:cellAria'] },
				selected: { type: Array, protected: true, triggers: ['change:selection'] },
				/** Заголовки шапки — по одному на показанную колонку, в её порядке */
				shownColumns: { type: Array, protected: true, triggers: ['change:shownColumns'] },
				shownSelection: {
					type: String,
					protected: true,
					triggers: ['change:shownSelection'],
				},
				/**
				 * Сколько колонок в строке вместе с колонкой выбора — `colspan`
				 * ячейки пустой таблицы. Посчитанное в разметке повторилось бы в
				 * каждом адаптере.
				 */
				columnCount: {
					type: Number,
					protected: true,
					triggers: ['change:shownColumns', 'change:selecting'],
				},
			},
			/**
			 * Пользователь задал ширину колонки ручкой — одно событие на действие,
			 * с колонкой и итогом её ширины; переставил колонку — одно событие на
			 * действие, с колонкой и новым порядком полей. По ним приложение
			 * сохраняет настройку.
			 */
			events: ['column:resize', 'column:move'],
		},
	}),
)

export const TableCollectionRowDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TTableRowCollectionFacade,

		/**
		 * Item-level пропсы строки — то, что выводит фасад
		 * `TTableRowCollectionFacade`: выбор, ячейки, имя строки, включён ли
		 * выбор строк и набор ячеек сетки.
		 */
		contribution: {
			props: {
				selected: { type: Boolean, triggers: ['change:selected'] },
				/** Ячейки — по одной на показанную колонку, в её порядке */
				cells: { type: Array, protected: true, triggers: ['change:cells'] },
				/**
				 * `id` заголовка строки — им называют чекбокс выбора строки. Пока
				 * колонки заголовка нет или она скрыта, ссылки нет.
				 */
				rowHeaderId: { type: String, protected: true, triggers: ['change:cells'] },
				/** Выбор строк включён — у строки ячейка выбора */
				selecting: { type: Boolean, protected: true, triggers: ['change:selecting'] },
				/**
				 * Набор каждой ячейки строки, и ячейки выбора тоже: у ячеек нет
				 * экземпляра. В сетке ячейка принимает фокус, вне сетки набор пуст.
				 */
				cellAria: { type: Object, protected: true, triggers: ['change:cellAria'] },
			},
		},
	}),
)
