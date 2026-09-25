/**
 * Дескриптор Scroller (TScroller) — лента произвольного содержимого в одну
 * строку, которую двигают две кнопки.
 *
 * Наследует ControlDescriptor (size, variant, disabled, focused, наборы,
 * плагины element/ready/action/aria) и добавляет имена кнопок, атрибуты
 * вьюпорта от потребителя, выходы для разметки и плагин вьюпорта.
 */

import { defineComponent, defineDescriptor } from '../../../protected/define'
import { TScroller } from '@soldy-ui/core'
import { ScrollerViewportPluginDescriptor } from '../plugins'
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
				prevLabel: { type: String, triggers: ['change:prevLabel'] },
				nextLabel: { type: String, triggers: ['change:nextLabel'] },
				/**
				 * Роль ряда и всё, что к ней прилагается, приходит от
				 * потребителя: своего экземпляра у вьюпорта нет, а кнопкам
				 * внутри `role="listbox"` места нет — отсюда и проп.
				 */
				viewportAria: { type: Object, triggers: ['change:viewportAria'] },
				/** Имена кнопок: своего экземпляра у них нет, набор отдаётся значением. */
				prevAria: { type: Object, protected: true, triggers: ['change:prevLabel'] },
				nextAria: { type: Object, protected: true, triggers: ['change:nextLabel'] },
				/**
				 * Выключенность кнопок считает ядро: «выключена лента **или**
				 * упёрлись в край» — одно правило, а не условие в шести
				 * разметках.
				 */
				prevDisabled: {
					type: Boolean,
					protected: true,
					triggers: ['change:canPrev', 'change:resolvedDisabled'],
				},
				nextDisabled: {
					type: Boolean,
					protected: true,
					triggers: ['change:canNext', 'change:resolvedDisabled'],
				},
				/** `tabindex` вьюпорта: `0`, когда листать есть куда, а своих остановок нет. */
				viewportTabIndex: {
					type: Number,
					protected: true,
					triggers: ['change:canPrev', 'change:canNext', 'change:hasTabStops'],
				},
			},
		},

		// Замер краёв, прокрутка и клики по кнопкам: всё это операции над DOM
		plugins: [ScrollerViewportPluginDescriptor],
	}),
)
