/**
 * Дескриптор ProgressSpinner (TProgressSpinner) — индикатор выполнения
 * кольцом.
 *
 * Наследует ProgressDescriptor (модель доли: значение, шкала, флаг бега,
 * плагин имени — поверх StylableDescriptor) и добавляет выход
 * `fractionStyle`. Своих входов у кольца нет: оси у него нет, толщину даёт
 * тема по размеру.
 */

import { defineComponent, defineDescriptor } from '../../../protected/define'
import { TProgressSpinner } from '@soldy-ui/core'
import { ProgressDescriptor } from './progress.descriptor'

export const ProgressSpinnerDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TProgressSpinner,

		extends: ProgressDescriptor(),

		contribution: {
			props: {
				/**
				 * Доля готового — `--s-progress-spinner-fraction`, числом от 0
				 * до 1. Считает ядро, как `percentStyle` у линии. Пока кольцо
				 * бежит, переменной нет — отсюда триггер флага.
				 */
				fractionStyle: {
					type: Object,
					protected: true,
					triggers: ['change:value', 'change:min', 'change:max', 'change:indeterminate'],
				},
			},
		},
	}),
)
