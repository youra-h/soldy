/**
 * Дескриптор Rating (TRating) — оценка звёздами: ползунок с одной ручкой,
 * у которого шкала — ряд звёзд.
 *
 * Наследует InputControlDescriptor (readonly, required, id, value, name,
 * disabled, focused, size, variant, наборы, плагины element/ready/action/aria)
 * и добавляет число звёзд и шаг, выход звёзд для разметки, слот значка и
 * плагины: указатель и клавиатуру Slider — оценка реализует их контракт
 * (`ISlidable`), — наведение, строку значения от локали и обязательность:
 * `required` нативный range не знает, и форму с обязательной оценкой, которую
 * не поставили, не отправляет плагин — ошибкой поля со строкой локали.
 */

import { defineComponent, defineDescriptor, defineType } from '../../../protected/define'
import { TRating } from '@soldy-ui/core'
import { fieldOf } from '@soldy-ui/plugins'
import {
	ActionPluginDescriptor,
	RatingHoverPluginDescriptor,
	RatingNamesPluginDescriptor,
	RatingValidityPluginDescriptor,
	SlideKeyboardPluginDescriptor,
	SlidePointerPluginDescriptor,
} from '../plugins'
import { InputControlDescriptor } from './input-control.descriptor'

export const RatingDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TRating,

		extends: InputControlDescriptor(),

		contribution: {
			/**
			 * Звёзды — разметка, а не части-компоненты: потребитель их не
			 * адресует, число звёзд задаёт `max`. Их значок — слот со scope
			 * звезды, по умолчанию — иконка роли `star` из пакета иконок.
			 */
			slots: {
				icon: {
					scope: {
						value: defineType<number>(Number),
						filled: defineType<boolean>(Boolean),
					},
					description:
						'Значок звезды — в обоих её слоях: пустом снизу (filled — false) и залитом сверху (filled — true). По умолчанию — иконка роли star',
				},
			},
			props: {
				/**
				 * Значение переобъявлено типом: оценка — число. Триггер остаётся
				 * у ValueControl.
				 */
				value: { type: Number },
				max: { type: Number, triggers: ['change:max'] },
				step: { type: Number, triggers: ['change:step'] },
				/**
				 * Звёзды: номер и доля заливки (`--so-rating-fraction`). Своего
				 * экземпляра у звезды нет — её стиль отдаётся значением. Доля —
				 * от предпросмотра наведением, пока он идёт, иначе от значения;
				 * число звёзд — от `max`.
				 */
				stars: {
					type: Array,
					protected: true,
					triggers: ['change:value', 'change:max', 'change:preview'],
				},
			},
			events: ['commit'],
		},

		plugins: [
			// Фокус держит поле ручки, а корень — ряд звёзд вокруг: туда
			// `focused = true` и ставит фокус
			ActionPluginDescriptor.with({ focusTarget: fieldOf }),
			SlidePointerPluginDescriptor,
			SlideKeyboardPluginDescriptor,
			RatingHoverPluginDescriptor,
			RatingNamesPluginDescriptor,
			RatingValidityPluginDescriptor,
		],
	}),
)
