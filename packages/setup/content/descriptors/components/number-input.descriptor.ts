/**
 * Дескриптор NumberInput (TNumberInput) — поле числа.
 *
 * Наследует `ClearableDescriptor` (кнопка очистки — clearable, clearAria — поверх
 * value, name, readonly, required, id, disabled, size, variant, ...) и
 * добавляет границы и шаг, крупный шаг, формат числа (`formatOptions`:
 * процент, валюта, единица, точность), подсказку пустого поля, слоты
 * `leading`, `clear`, `trailing` и значков кнопок шага и событие `commit` —
 * конец действия. Язык формата — тег локали поддерева: его пишет плагин
 * языка, имена кнопок очистки и шага — плагин имён поля.
 *
 * Число набирают в поле текстом в формате локали: что набирается, решает ядро,
 * а правку браузера до него доводит плагин набора; клавиши шага и кнопки шага
 * с удержанием переводят в команды ядра свои плагины.
 *
 * Разметка: корень — коробка поля, в нём слоты, ввод `<input type="text">` с
 * ролью `spinbutton`, кнопки «меньше» и «больше» — не остановки Tab — и
 * скрытое поле формы. См. AGENTS.md, «Готовые паттерны», NumberInput.
 */

import { defineComponent, defineDescriptor, defineType } from '../../../protected/define'
import { TNumberInput } from '@soldy-ui/core'
import type { INumberInput } from '@soldy-ui/core'
import {
	LocalePluginDescriptor,
	NumberInputKeyboardPluginDescriptor,
	NumberInputNamesPluginDescriptor,
	NumberInputStepperPluginDescriptor,
	NumberInputTouchPluginDescriptor,
	NumberInputTypingPluginDescriptor,
} from '../plugins'
import { ClearableDescriptor } from './clearable.descriptor'

/**
 * Поводы перечитать, выключена ли кнопка шага: итог значения, шкала, выключенное
 * поле и только для чтения.
 */
const STEPPER_TRIGGERS = [
	'change:value',
	'change:min',
	'change:max',
	'change:step',
	'change:disabled',
	'change:readonly',
] as const

export const NumberInputDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TNumberInput,

		extends: ClearableDescriptor(),

		contribution: {
			/**
			 * Слоты стоят по сторонам ввода, как у Input: содержимое получает сам
			 * инстанс поля — кнопке рядом нужны его значение и команды. Кнопка
			 * очистки стоит в обёртке `trailing` перед его содержимым; кнопки шага —
			 * после слотов, у конца поля.
			 *
			 * Своя кнопка очистки (`clear`) заменяет встроенную целиком и рисуется,
			 * когда задана, без `clearable`. Значки кнопок шага — свои слоты: кнопка с
			 * удержанием остаётся своей, меняется значок.
			 */
			slots: {
				leading: {
					scope: { ctrl: defineType<INumberInput>(Object) },
					description: 'Перед числом',
				},
				clear: {
					scope: { clear: defineType<() => void>(Function) },
					description: 'Кнопка очистки значения',
				},
				trailing: {
					scope: { ctrl: defineType<INumberInput>(Object) },
					description: 'После числа и кнопки очистки',
				},
				'decrement-icon': {
					description: 'Значок кнопки «меньше». По умолчанию — иконка роли minus',
				},
				'increment-icon': {
					description: 'Значок кнопки «больше». По умолчанию — иконка роли plus',
				},
			},
			props: {
				/**
				 * Числом: значение поля — число, а не текст; пусто — не задано.
				 * Триггер остаётся у ValueControl.
				 */
				value: { type: Number },
				min: { type: Number, triggers: ['change:min'] },
				max: { type: Number, triggers: ['change:max'] },
				step: { type: Number, triggers: ['change:step'] },
				largeStep: { type: Number, triggers: ['change:largeStep'] },
				/**
				 * Опции `Intl.NumberFormat` — процент, валюта, единица, точность.
				 * Сверяются по содержимому: литерал в разметке на каждом проходе — не
				 * смена.
				 */
				formatOptions: { type: Object, triggers: ['change:formatOptions'] },
				placeholder: { type: String, triggers: ['change:placeholder'] },
				/**
				 * Язык формата — не вход: его задаёт приложение на всю библиотеку,
				 * и пишет плагин языка.
				 */
				locale: { type: String, protected: true, triggers: ['change:locale'] },
				/** Текст ввода — буфер правки ядра: набранное или число строкой формата. */
				text: { type: String, protected: true, triggers: ['change:text'] },
				decrementDisabled: {
					type: Boolean,
					protected: true,
					triggers: [...STEPPER_TRIGGERS],
				},
				incrementDisabled: {
					type: Boolean,
					protected: true,
					triggers: [...STEPPER_TRIGGERS],
				},
				/** Наборы кнопок шага: `tabindex` — ядро, имя — плагин имён. */
				decrementAria: {
					type: Object,
					protected: true,
					triggers: ['change:decrementAria'],
				},
				incrementAria: {
					type: Object,
					protected: true,
					triggers: ['change:incrementAria'],
				},
				/** Наборы темы кнопок шага: `data-pressed`, пока кнопку держат. */
				decrementDataset: {
					type: Object,
					protected: true,
					triggers: ['change:decrementDataset'],
				},
				incrementDataset: {
					type: Object,
					protected: true,
					triggers: ['change:incrementDataset'],
				},
				/**
				 * ARIA ввода: роль счётчика, число и его строка, заданные границы;
				 * поверх — набор поля от плагинов. Перечитывается на значение,
				 * границы, формат и смену набора.
				 */
				inputAria: {
					type: Object,
					protected: true,
					triggers: [
						'change:inputSets',
						'change:value',
						'change:min',
						'change:max',
						'change:locale',
						'change:formatOptions',
					],
				},
				/** `dir`, `lang` и `inputmode` ввода — по формату; поверх — набор поля. */
				inputAttrs: {
					type: Object,
					protected: true,
					triggers: ['change:inputSets', 'change:locale', 'change:formatOptions'],
				},
			},
			events: ['commit'],
		},

		plugins: [
			// Имена кнопок очистки и шага от локали — с первой отрисовки
			NumberInputNamesPluginDescriptor,
			// Язык приложения — до набора и клавиш: формат с первой отрисовки
			LocalePluginDescriptor,
			// Набор: правка, которую ядро не возьмёт, гасится до того, как встанет
			NumberInputTypingPluginDescriptor,
			// ↑/↓, PageUp/PageDown, Home/End, Enter
			NumberInputKeyboardPluginDescriptor,
			// Кнопки шага: нажатие, удержание, скринридер
			NumberInputStepperPluginDescriptor,
			// Роль и клавиатура на сенсорных устройствах Apple
			NumberInputTouchPluginDescriptor,
		],
	}),
)
