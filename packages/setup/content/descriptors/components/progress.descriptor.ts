/**
 * Дескриптор Progress (TProgress) — индикатор выполнения, общая база линии и
 * кольца.
 *
 * Наследует StylableDescriptor (rendered, visible, present, tag, direction,
 * наборы, size, variant, плагины element/ready) и добавляет модель доли:
 * значение, шкалу, флаг бега и плагин имени. Форму — ось, выход доли в своём
 * виде — приносят наследники.
 */

import { defineComponent, defineDescriptor } from '../../../protected/define'
import { TProgress } from '@soldy-ui/core'
import { AriaPluginDescriptor } from '../plugins'
import { StylableDescriptor } from './stylable.descriptor'

export const ProgressDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TProgress,

		extends: StylableDescriptor(),

		contribution: {
			props: {
				/** Сколько готово — число на шкале от `min` до `max`, по умолчанию 0 */
				value: { type: Number, triggers: ['change:value'] },
				min: { type: Number, triggers: ['change:min'] },
				max: { type: Number, triggers: ['change:max'] },
				/**
				 * Доля неизвестна — индикатор бежит. Главнее `value`: оно
				 * хранится и вернётся, когда бег снимут
				 */
				indeterminate: { type: Boolean, triggers: ['change:indeterminate'] },
			},
		},

		// Имя — `aria_label` или `aria_labelledBy`. Опции `role` у плагина нет:
		// она значит «без имени элемент декоративен», а индикатор и без имени
		// индикатор. Роль `progressbar` пишет ядро
		plugins: [AriaPluginDescriptor],
	}),
)
