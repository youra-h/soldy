/**
 * Дескриптор Table (TTable) — таблица по паттернам APG Table и Sortable Table.
 *
 * Наследует `ControlDescriptor` (disabled, focused, size, variant, имя
 * `aria_label` / `aria_labelledBy`, ...) и добавляет язык сортировки — тег
 * локали поддерева, его пишет плагин языка, — имя чекбокса «выбрать все» —
 * выход плагина имён (`names_selectAll`), — закреплённую шапку
 * (`stickyHead`): свойство вида таблицы, теме оно уходит `data-sticky-head`
 * в наборе `dataset` корня, — то, как колонки без своей ширины делят место
 * (`columnFit`): его читает раскладка колонок, а не тема. Место мерит плагин
 * раскладки — ширину окна таблицы, — и тема получает от ядра готовые ширины
 * колонок и `data-overflow`. И то, что идёт за жестом перестановки колонки
 * (`reorderPreview`): шапка или колонка целиком, — теме оно уходит
 * `data-reorder-preview`. Строки, колонки, ячейки, выбор и сортировка —
 * коллекция и её расширения (`TableCollectionDescriptor`): разметка только
 * раскладывает то, что они отдали.
 *
 * Колонки и строки задаются только данными (`columns`, `items`): частей
 * разметкой у таблицы нет — заголовок колонки (`Table.Column`) и строку
 * (`Table.Row`) рисует она сама. Поэтому и слота по умолчанию у неё нет, а
 * содержимое заголовка и ячейки — статические слоты со scope: колонку
 * выбирают условием по `column.field`, как элемент коллекции по `item.value`
 * (AGENTS.md, «Слоты элементов»).
 */

import { defineComponent, defineDescriptor, defineType } from '../../../../protected/define'
import { TTable } from '@soldy-ui/core'
import type { ITableColumn, ITableRow } from '@soldy-ui/core'
import { ControlDescriptor } from '../control.descriptor'
import {
	CollectionBundlesPluginDescriptor,
	CollectionElementsPluginDescriptor,
	LocalePluginDescriptor,
	TableColumnReorderPluginDescriptor,
	TableGridPluginDescriptor,
	TableLayoutPluginDescriptor,
	TableNamesPluginDescriptor,
} from '../../plugins'

export const TableDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TTable,

		extends: ControlDescriptor(),

		contribution: {
			slots: {
				/**
				 * Проброс слота заголовка колонки (`Table.Column`): его scope — текст
				 * и сортируемость колонки — плюс сама колонка.
				 */
				header: {
					scope: {
						column: defineType<ITableColumn>(Object),
						text: defineType<string>(String),
						sortable: defineType<boolean>(Boolean),
					},
					description: 'Содержимое заголовка колонки. Без него — текст колонки',
				},
				/**
				 * `value` — поле записи под ключом колонки. Тип записи таблица не
				 * знает (`TTableRecord` — любой объект), поэтому значение —
				 * `unknown`, и сужает его потребитель.
				 */
				cell: {
					scope: {
						row: defineType<ITableRow>(Object),
						column: defineType<ITableColumn>(Object),
						value: defineType<unknown>(Object),
					},
					description: 'Содержимое ячейки. Без него — значение текстом',
				},
				empty: { description: 'Когда показанных строк нет' },
			},
			props: {
				/**
				 * Язык сортировки — не вход: это тег локали поддерева, и пишет его
				 * плагин языка, как `size` элементам пишет владелец.
				 */
				locale: { type: String, protected: true, triggers: ['change:locale'] },
				/**
				 * Шапка закреплена у верхнего края прокрутки, по умолчанию нет.
				 * Свойство таблицы, а не коллекции: строки и колонки от него не
				 * меняются, а закрепляет шапку тема по `data-sticky-head`.
				 */
				stickyHead: { type: Boolean, triggers: ['change:stickyHead'] },
				/**
				 * Как колонки без своей ширины делят место, по умолчанию `auto` —
				 * во всю ширину места. Значение библиотеки: его читает раскладка
				 * колонок, а теме оно не уходит.
				 */
				columnFit: { type: String, triggers: ['change:columnFit'] },
				/**
				 * Что идёт за жестом перестановки колонки, по умолчанию `head` —
				 * шапка, а тело стоит до отпускания; `column` — и ячейки
				 * нарисованных строк. Модель от него не меняется: рисует жест тема
				 * по `data-reorder-preview`.
				 */
				reorderPreview: { type: String, triggers: ['change:reorderPreview'] },
			},
		},

		plugins: [
			// Язык сортировки — с первой отрисовки
			LocalePluginDescriptor,
			// Имя чекбокса «выбрать все» от локали
			TableNamesPluginDescriptor,
			// Коллекция строк: реестр bundles — от него плагины узнают движок — и
			// доступ к узлам строк
			CollectionBundlesPluginDescriptor,
			CollectionElementsPluginDescriptor,
			// Место под колонки — ширина окна таблицы. После реестра bundles:
			// движок узнаёт от него
			TableLayoutPluginDescriptor,
			// Перестановка колонок указателем и клавишами. После реестра bundles:
			// движок узнаёт от него
			TableColumnReorderPluginDescriptor,
			// Сетка: клавиши, выбор строки нажатием, DOM-фокус за фокусом сетки.
			// После реестров: движок и узлы строк узнаёт от них
			TableGridPluginDescriptor,
			// Окна в составе нет: плагин замера ставит обёртка `Virtual`, когда
			// таблица подхватывает её окно
		],
	}),
)
