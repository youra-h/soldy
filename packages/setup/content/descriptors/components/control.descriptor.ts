/**
 * Дескриптор Control (TControl).
 *
 * Наследует StylableDescriptor (size, variant, rendered, visible, present, tag, classes, element, instance)
 * и добавляет disabled, disabledResolved, focused.
 */

import { defineComponent, defineDescriptor } from '../../../protected/define'
import { TControl } from '@soldy-ui/core'
import { ActionPluginDescriptor, AriaPluginDescriptor } from '../plugins'
import { StylableDescriptor } from './stylable.descriptor'

export const ControlDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TControl,

		extends: StylableDescriptor(),

		contribution: {
			props: {
				/** Своё значение — вход разметки и модель двусторонней привязки. */
				disabled: { type: Boolean, triggers: ['change:disabled'] },
				/**
				 * Итог: у элемента коллекции — своё **или** владельца. Входа у
				 * него нет, задают `disabled`; итог читает разметка — им
				 * выключают нативный контрол и строку элемента.
				 */
				disabledResolved: {
					type: Boolean,
					protected: true,
					triggers: ['change:disabled:resolved'],
				},
				focused: { type: Boolean, triggers: ['change:focused'] },
				// `aria` объявлен в ComponentViewDescriptor — набор нужен и
				// неинтерактивным слоям, а второе объявление accessor не примет.
			},
		},

		// Доступное имя — обязательное свойство любого интерактивного элемента,
		// а не опция: без него кнопка без текста для скринридера безымянна.
		plugins: [ActionPluginDescriptor, AriaPluginDescriptor],
	}),
)
