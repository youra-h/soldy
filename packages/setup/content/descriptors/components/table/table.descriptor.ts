/**
 * Дескриптор Table (TTable) — таблица по паттернам APG Table и Sortable Table.
 *
 * Наследует `ControlDescriptor` (disabled, focused, size, variant, имя
 * `aria_label` / `aria_labelledBy`, ...) и добавляет язык сортировки и имя
 * чекбокса «выбрать все» — выходами: язык и словарь задаёт приложение на всю
 * библиотеку, и пишут их плагины языка и словаря. Строки, колонки, ячейки,
 * выбор и сортировка — коллекция и её расширения
 * (`TableCollectionDescriptor`): разметка только раскладывает то, что они
 * отдали.
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
import { LocalePluginDescriptor, TranslationsPluginDescriptor } from '../../plugins'

export const TableDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TTable,

		extends: ControlDescriptor(),

		contribution: {
			slots: {
				header: {
					scope: { column: defineType<ITableColumn>(Object) },
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
				 * Язык сортировки — не вход: его задаёт приложение на всю
				 * библиотеку, и пишет плагин языка, как `size` элементам пишет
				 * владелец.
				 */
				locale: { type: String, protected: true, triggers: ['change:locale'] },
				/**
				 * Имя чекбокса «выбрать все» — из словаря: своего текста у ячейки
				 * шапки нет, и разметка отдаёт чекбоксу готовое имя.
				 */
				selectAllLabel: {
					type: String,
					protected: true,
					triggers: ['change:translations'],
				},
			},
		},

		plugins: [
			// Язык и словарь приложения — с первой отрисовки
			LocalePluginDescriptor,
			TranslationsPluginDescriptor,
		],
	}),
)
