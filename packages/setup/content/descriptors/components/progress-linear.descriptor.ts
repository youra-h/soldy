/**
 * Дескриптор ProgressLinear (TProgressLinear) — индикатор выполнения линией.
 *
 * Наследует ProgressDescriptor (модель доли: значение, шкала, флаг бега,
 * плагин имени — поверх StylableDescriptor) и добавляет ось и выход
 * `percentStyle`.
 */

import { defineComponent, defineDescriptor } from '../../../protected/define'
import { TProgressLinear } from '@soldy-ui/core'
import { ProgressDescriptor } from './progress.descriptor'

export const ProgressLinearDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TProgressLinear,

		extends: ProgressDescriptor(),

		contribution: {
			props: {
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
	}),
)
