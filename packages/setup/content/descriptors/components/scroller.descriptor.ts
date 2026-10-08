/**
 * Дескриптор Scroller (TScroller) — лента произвольного содержимого в одну
 * строку, которую двигают две кнопки.
 *
 * Наследует ControlDescriptor (size, variant, disabled, focused, наборы,
 * плагины element/ready/action/aria) и добавляет атрибуты вьюпорта от
 * потребителя, выходы для разметки, плагин вьюпорта и плагин имён кнопок
 * от локали.
 */

import { defineComponent, defineDescriptor } from '../../../protected/define'
import { TScroller } from '@soldy-ui/core'
import { ScrollerNamesPluginDescriptor, ScrollerViewportPluginDescriptor } from '../plugins'
import { ControlDescriptor } from './control.descriptor'

export const ScrollerDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TScroller,

		extends: ControlDescriptor(),

		contribution: {
			/**
			 * Содержимое — слот, а не коллекция: лента не владеет тем, что
			 * листает. У первого потребителя набор тегов уже есть, и второй был
			 * бы вторым путём к тем же данным.
			 */
			slots: {
				default: { description: 'Содержимое ленты: лежит прямо во вьюпорте' },
				'prev-icon': { description: 'Значок кнопки «назад»' },
				'next-icon': { description: 'Значок кнопки «вперёд»' },
			},
			props: {
				/**
				 * Роль ряда и всё, что к ней прилагается, приходит от
				 * потребителя: своего экземпляра у вьюпорта нет, а кнопкам
				 * внутри `role="listbox"` места нет — отсюда и проп.
				 */
				viewportAria: { type: Object, triggers: ['change:viewportAria'] },
				/**
				 * Наборы кнопок: своего экземпляра у кнопок нет, и наборы держит
				 * лента. Имена в них пишет `TScrollerNamesPlugin`.
				 */
				prevAria: { type: Object, protected: true, triggers: ['change:prevAria'] },
				nextAria: { type: Object, protected: true, triggers: ['change:nextAria'] },
				/**
				 * Выключенность кнопок считает ядро: «выключена лента **или**
				 * упёрлись в край» — одно правило, а не условие в шести
				 * разметках.
				 */
				prevDisabled: {
					type: Boolean,
					protected: true,
					triggers: ['change:canPrev', 'change:disabled'],
				},
				nextDisabled: {
					type: Boolean,
					protected: true,
					triggers: ['change:canNext', 'change:disabled'],
				},
				/** `tabindex` вьюпорта: `0`, когда листать есть куда, а своих остановок нет. */
				viewportTabIndex: {
					type: Number,
					protected: true,
					triggers: ['change:canPrev', 'change:canNext', 'change:hasTabStops'],
				},
			},
		},

		plugins: [
			// Замер краёв, прокрутка и клики по кнопкам: всё это операции над DOM
			ScrollerViewportPluginDescriptor,
			// Имена кнопок от локали
			ScrollerNamesPluginDescriptor,
		],
	}),
)
