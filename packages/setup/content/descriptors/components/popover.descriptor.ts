/**
 * Дескриптор Popover (TPopover) — панель с произвольным содержимым у триггера.
 *
 * Наследует ComponentViewDescriptor (rendered, visible, tag, наборы и плагины
 * element/ready) и добавляет открытость, кнопку закрытия, `lazyMount`,
 * сторону панели, выходы для разметки и плагины: имя диалога, нажатие мимо,
 * клик по триггеру и модель фокуса.
 */

import { defineComponent, defineDescriptor, defineType } from '../../../protected/define'
import { TPopover } from '@soldy-ui/core'
import type { TAriaAttributes, TDatasetAttributes } from '@soldy-ui/core'
import {
	AriaPluginDescriptor,
	DismissPluginDescriptor,
	PopoverFocusPluginDescriptor,
	PopoverPointerPluginDescriptor,
} from '../plugins'
import { ComponentViewDescriptor } from './component-view.descriptor'

export const PopoverDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TPopover,

		extends: ComponentViewDescriptor(),

		contribution: {
			/**
			 * Триггер — слот внутри корня, а не внешний элемент по ссылке: корень
			 * служит панели якорем, а нажатие по открытому триггеру остаётся
			 * нажатием внутри владельца, и панель не мигает. Своей ARIA у
			 * содержимого слота нет, поэтому сторону связки для него компонент
			 * отдаёт в scope — как `clear` у Select.
			 */
			slots: {
				trigger: {
					scope: {
						triggerAria: defineType<TAriaAttributes>(Object),
						triggerDataset: defineType<TDatasetAttributes>(Object),
					},
					description:
						'Элемент, который открывает панель. ARIA и data-* для него — в scope',
				},
				default: { description: 'Содержимое панели' },
				'close-icon': { description: 'Иконка кнопки закрытия' },
			},
			props: {
				open: { type: Boolean, triggers: ['change:open'] },
				closable: { type: Boolean, triggers: ['change:closable'] },
				closeLabel: { type: String, triggers: ['change:closeLabel'] },
				lazyMount: { type: Boolean, triggers: ['change:lazyMount'] },
				placement: { type: String, triggers: ['change:placement'] },
				/**
				 * Сторона триггера в связке с панелью и его вид «нажат». Вычисляет
				 * ядро, шаблон раскладывает в scope слота `trigger`: оставь их в
				 * разметке — и формула повторится в каждом из шести адаптеров.
				 */
				triggerAria: { type: Object, protected: true, triggers: ['change:open'] },
				triggerDataset: { type: Object, protected: true, triggers: ['change:open'] },
				/** Имя кнопки закрытия. Отдельный набор: кнопка — сосед содержимого. */
				closeAria: { type: Object, protected: true, triggers: ['change:closeLabel'] },
				/** Смонтировано ли содержимое: `lazyMount` прячет его до первого открытия. */
				contentRendered: {
					type: Boolean,
					protected: true,
					triggers: ['change:open', 'change:lazyMount'],
				},
			},
		},

		plugins: [
			// Имя диалога: у панели `role="dialog"`, и без имени скринридер
			// объявит безымянный диалог
			AriaPluginDescriptor,
			// Нажатие мимо и уход фокуса мимо: фокус у поповера уходит в панель,
			// и без `focusOutside` Tab со страницы оставлял бы её открытой
			DismissPluginDescriptor.with({ focusOutside: true }),
			// Клик по триггеру переключает панель
			PopoverPointerPluginDescriptor,
			// Фокус, Escape и Tab. После dismiss: берёт у него панель и `dismiss`
			PopoverFocusPluginDescriptor,
		],
	}),
)
