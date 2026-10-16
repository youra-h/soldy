/**
 * Дескриптор Pagination (TPagination).
 *
 * Наследует `ValueControlDescriptor` (value, name, disabled, focused, size,
 * variant, ...) и добавляет то, что задаёт потребитель: откуда берутся
 * страницы — `total` и `pageSize` или список `pages`, — и сколько их стоит в
 * середине окна. Язык номеров и имена стрелок — от локали поддерева: их пишут
 * плагины языка и имён, а разметка получает готовые выходы. Страницы окна,
 * текущую и пропуски держит коллекция (`PaginationCollectionDescriptor`).
 *
 * Своего паттерна APG у пагинации нет. Корень — `nav`, ориентир для
 * скринридера; имя ему даёт приложение (`aria_label`, `aria_labelledBy`), а
 * не локаль: что листают, знает только оно. Текущая страница —
 * `aria-current="page"`. Стрелки и страницы — нативные кнопки, каждая — своя
 * остановка Tab, поэтому клавиатурного плагина нет. Стрелку, погасшую у края
 * под фокусом, выключенной кнопкой браузер оставил бы без фокуса — его
 * переводит на текущую страницу плагин фокуса. См. AGENTS.md, «Готовые
 * паттерны».
 */

import { defineComponent, defineDescriptor, defineType } from '../../../../protected/define'
import { TPagination } from '@soldy-ui/core'
import type { IPaginationItem } from '@soldy-ui/core'
import { ValueControlDescriptor } from '../value-control.descriptor'
import {
	CollectionBundlesPluginDescriptor,
	CollectionElementsPluginDescriptor,
	LocalePluginDescriptor,
	PaginationFocusPluginDescriptor,
	PaginationNamesPluginDescriptor,
} from '../../plugins'

export const PaginationDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TPagination,

		extends: ValueControlDescriptor(),

		contribution: {
			/**
			 * Страницы — не слот: их кладёт в коллекцию расширение пагинации по
			 * окну, и страница из разметки попала бы в неё мимо окна. Поэтому
			 * `default` пагинация не рисует, а содержимое страницы — статический
			 * слот `item`, который получает страницу через scope (см. «Слоты
			 * элементов»), а с ней — scope слота страницы: её текст (`text`).
			 */
			slots: {
				item: {
					scope: {
						item: defineType<IPaginationItem>(Object),
						text: defineType<string>(String),
					},
					description: 'Содержимое страницы. Без него — номер или текст страницы',
				},
				// Подмена значков стрелок в одном месте; по умолчанию — роль
				// `arrowRight` у обеих, стрелку «назад» зеркалит тема
				'prev-icon': { description: 'Значок стрелки «назад»' },
				'next-icon': { description: 'Значок стрелки «вперёд»' },
			},
			props: {
				/**
				 * Ключ текущей страницы — число или строка: номер у числовой
				 * пагинации, `value` страницы у текстовой. Переобъявлен только тип,
				 * триггеры — от `ValueControlDescriptor`.
				 */
				value: { type: [Number, String] },
				total: { type: Number, triggers: ['change:total'] },
				pageSize: { type: Number, triggers: ['change:pageSize'] },
				/**
				 * Страницы текстовой пагинации — `{ text, value? }` по порядку
				 * списка. Сверяются по тексту и ключу: литерал в разметке,
				 * собранный заново тем же составом, — не смена.
				 */
				pages: { type: Array, triggers: ['change:pages'] },
				middleCount: { type: Number, triggers: ['change:middleCount'] },
				/**
				 * Язык номеров страниц — не вход: это тег локали поддерева, и
				 * пишет его плагин языка.
				 */
				locale: { type: String, protected: true, triggers: ['change:locale'] },
				/**
				 * Наборы стрелок: своего экземпляра у стрелок нет, и наборы держит
				 * пагинация. Имена в них пишет `TPaginationNamesPlugin`.
				 */
				prevAria: { type: Object, protected: true, triggers: ['change:prevAria'] },
				nextAria: { type: Object, protected: true, triggers: ['change:nextAria'] },
				/**
				 * Выключенность стрелок считает пагинация: «выключена, текущей
				 * страницы нет или она на краю» — одно правило, а не условие в
				 * шести разметках. Перечитывается на смену всего, от чего зависит.
				 */
				prevDisabled: {
					type: Boolean,
					protected: true,
					triggers: [
						'change:value',
						'change:total',
						'change:pageSize',
						'change:pages',
						'change:disabled',
					],
				},
				nextDisabled: {
					type: Boolean,
					protected: true,
					triggers: [
						'change:value',
						'change:total',
						'change:pageSize',
						'change:pages',
						'change:disabled',
					],
				},
			},
		},

		plugins: [
			// Язык — до поведения: номера в цифрах локали с первой отрисовки
			LocalePluginDescriptor,
			// Коллекция: реестр bundles страниц + доступ к их DOM-узлам
			CollectionBundlesPluginDescriptor,
			CollectionElementsPluginDescriptor,
			// Имена стрелок от локали
			PaginationNamesPluginDescriptor,
			// Стрелка погасла у края под фокусом — фокус на текущую страницу.
			// После плагинов коллекции: движок и узлы страниц — от них
			PaginationFocusPluginDescriptor,
		],
	}),
)
