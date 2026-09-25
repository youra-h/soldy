/**
 * Дескриптор Slider (TSlider) — ползунок: число или несколько чисел,
 * которые задают перетаскиванием, клавишами и жестом скринридера.
 *
 * Наследует ValueControlDescriptor (value, name, disabled, focused, size,
 * variant, наборы, плагины element/ready/action/aria) и добавляет шкалу,
 * ось, метки, щелчок к меткам, имена ручек, выходы для разметки и плагины
 * указателя и клавиатуры.
 */

import { defineComponent, defineDescriptor, defineType } from '../../../protected/define'
import { TSlider } from '@soldy-ui/core'
import { SlideKeyboardPluginDescriptor, SlidePointerPluginDescriptor } from '../plugins'
import { ValueControlDescriptor } from './value-control.descriptor'

/**
 * Триггеры выходов, которые зависят от позиции значения: сама она, границы
 * хода и сторона оси. Шаг меняет позицию только через значение, и его
 * `change:value` уже в списке.
 */
const POSITION_TRIGGERS = ['change:value', 'change:min', 'change:max', 'change:inverted'] as const

export const SliderDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TSlider,

		extends: ValueControlDescriptor(),

		contribution: {
			/**
			 * Ручки и метки — разметка, а не части-компоненты: потребитель их не
			 * адресует, число ручек задаёт значение. Их содержимое — слоты со
			 * scope элемента.
			 */
			slots: {
				mark: {
					scope: {
						value: defineType<number>(Number),
						label: defineType<string | undefined>(String),
					},
					description: 'Подпись метки. По умолчанию — её label; пустая подпись не видна',
				},
				thumb: {
					scope: {
						value: defineType<number>(Number),
						index: defineType<number>(Number),
					},
					description: 'Содержимое ручки после поля — место под подсказку со значением',
				},
			},
			props: {
				/**
				 * Значение переобъявлено типом: число — одна ручка, массив — по
				 * ручке на элемент. Триггер остаётся у ValueControl.
				 */
				value: { type: [Number, Array] },
				min: { type: Number, triggers: ['change:min'] },
				max: { type: Number, triggers: ['change:max'] },
				step: { type: [Number, Array], triggers: ['change:step'] },
				largeStep: { type: Number, triggers: ['change:largeStep'] },
				orientation: { type: String, triggers: ['change:orientation'] },
				inverted: { type: Boolean, triggers: ['change:inverted'] },
				origin: { type: Number, triggers: ['change:origin'] },
				marks: { type: [Boolean, Array], triggers: ['change:marks'] },
				minStepsBetweenThumbs: { type: Number, triggers: ['change:minStepsBetweenThumbs'] },
				thumbLabels: { type: Array, triggers: ['change:thumbLabels'] },
				/**
				 * Щелчок к меткам и его радиус в px. Что делает режим, решает
				 * стратегия плагина указателя: разметке и теме он не виден.
				 */
				snap: { type: String, triggers: ['change:snap'] },
				snapRadius: { type: Number, triggers: ['change:snapRadius'] },
				/**
				 * Ручки: значение, ход и шаг поля, позиция, `data-dragging` и имя.
				 * Своего экземпляра у ручки нет — её наборы отдаются значением.
				 * Ход поля сужают соседи и зазор, `data-dragging` — жест.
				 */
				thumbs: {
					type: Array,
					protected: true,
					triggers: [
						...POSITION_TRIGGERS,
						'change:step',
						'change:minStepsBetweenThumbs',
						'change:thumbLabels',
						'change:dragging',
					],
				},
				/** Края заливки: `--s-slider-range-start` и `--s-slider-range-end`. */
				rangeStyle: {
					type: Object,
					protected: true,
					triggers: [...POSITION_TRIGGERS, 'change:origin'],
				},
				/**
				 * Метки на рельсе: позиция, подпись, `data-in-range` и
				 * `data-current`. Точки шкалы зависят и от шага.
				 */
				shownMarks: {
					type: Array,
					protected: true,
					triggers: [
						...POSITION_TRIGGERS,
						'change:step',
						'change:marks',
						'change:origin',
					],
				},
			},
			events: ['commit'],
		},

		plugins: [SlidePointerPluginDescriptor, SlideKeyboardPluginDescriptor],
	}),
)
