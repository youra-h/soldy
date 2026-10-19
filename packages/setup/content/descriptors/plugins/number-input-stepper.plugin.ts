/**
 * Определение TNumberInputStepperPlugin (namespace `stepper`) — кнопки шага
 * поля числа.
 *
 * Нажатие шагает сразу и фокус из ввода не уводит, удержание повторяет шаг до
 * края с `data-pressed` в наборе кнопки, отпускание закрывает действие
 * (`commit`); нажатие скринридером — один шаг. Своих пропсов и выходов нет:
 * задержку и шаг повтора задают опции установки —
 * `NumberInputStepperPluginDescriptor.with({ repeatDelay: 500 })`.
 */

import { definePlugin } from '../../../protected/define'
import { TNumberInputStepperPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const NumberInputStepperPluginDescriptor = definePlugin({
	ctor: TNumberInputStepperPlugin,
	namespace: 'stepper',
	contribution: { events: [...PLUGIN_EVENTS] },
})
