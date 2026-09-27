/**
 * Дескриптор ProgressLinear (TProgressLinear) — индикатор выполнения линией.
 *
 * Наследует StylableDescriptor (rendered, visible, present, tag, direction,
 * наборы, size, variant, плагины element/ready) и добавляет значение, шкалу,
 * флаг бега, ось, выход `percentStyle` и плагин имени.
 */

import { defineComponent, defineDescriptor } from '../../../protected/define'
import { TProgressLinear } from '@soldy-ui/core'
import { AriaPluginDescriptor } from '../plugins'
import { StylableDescriptor } from './stylable.descriptor'

export const ProgressLinearDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TProgressLinear,

		extends: StylableDescriptor(),

		contribution: {
			props: {
				/** Сколько готово — число на шкале от `min` до `max`, по умолчанию 0 */
				value: { type: Number, triggers: ['change:value'] },
				min: { type: Number, triggers: ['change:min'] },
				max: { type: Number, triggers: ['change:max'] },
				/**
				 * Доля неизвестна — полоса бежит. Главнее `value`: оно хранится
				 * и вернётся на полосу, когда бег снимут
				 */
				indeterminate: { type: Boolean, triggers: ['change:indeterminate'] },
				/** Ось: `horizontal` (по умолчанию) или `vertical` — снизу вверх */
				orientation: { type: String, triggers: ['change:orientation'] },
				/**
				 * Доля готового — `--s-progress-linear-percent`. Считает ядро:
				 * в шести адаптерах одна формула была бы шесть раз. Пока полоса
				 * бежит, переменной нет — отсюда триггер флага.
				 */
				percentStyle: {
					type: Object,
					protected: true,
					triggers: ['change:value', 'change:min', 'change:max', 'change:indeterminate'],
				},
			},
		},

		// Имя — `aria_label` или `aria_labelledBy`. Опции `role` у плагина нет:
		// она значит «без имени элемент декоративен», а полоса и без имени
		// индикатор. Роль `progressbar` пишет ядро, как `status` у Spinner
		plugins: [AriaPluginDescriptor],
	}),
)
