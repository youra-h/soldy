/**
 * Дескриптор Control (TControl).
 *
 * Наследует StylableDescriptor (size, variant, rendered, visible, present, tag, classes, element, instance)
 * и добавляет disabled, focused.
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
				disabled: { type: Boolean, triggers: ['change:disabled'] },
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
