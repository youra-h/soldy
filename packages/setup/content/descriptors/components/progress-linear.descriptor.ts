/**
 * Дескриптор ProgressLinear (TProgressLinear) — индикатор выполнения линией.
 *
 * Наследует StylableDescriptor (rendered, visible, present, tag, direction,
 * наборы, size, variant, плагины element/ready) и добавляет значение, шкалу,
 * выход `percentStyle` и плагин имени.
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
				/** Сколько готово; `null` (по умолчанию) — доля неизвестна, полоса бежит */
				value: { type: Number, triggers: ['change:value'] },
				min: { type: Number, triggers: ['change:min'] },
				max: { type: Number, triggers: ['change:max'] },
				/**
				 * Доля готового — `--s-progress-linear-percent`. Считает ядро:
				 * в шести адаптерах одна формула была бы шесть раз.
				 */
				percentStyle: {
					type: Object,
					protected: true,
					triggers: ['change:value', 'change:min', 'change:max'],
				},
			},
		},

		// Имя — `aria_label` или `aria_labelledBy`. Опции `role` у плагина нет:
		// она значит «без имени элемент декоративен», а полоса и без имени
		// индикатор. Роль `progressbar` пишет ядро, как `status` у Spinner
		plugins: [AriaPluginDescriptor],
	}),
)
