/**
 * Дескриптор Icon (TIcon).
 *
 * Наследует ComponentViewDescriptor (rendered, visible, present, tag, classes, element, instance)
 * и добавляет size, width, height + плагин IconStyle.
 */

import { defineComponent, defineDescriptor } from '../../../protected/define'
import { TIcon } from '@soldy-ui/core'
import { IconLayoutPluginDescriptor, AriaPluginDescriptor } from '../plugins'
import { ComponentViewDescriptor } from './component-view.descriptor'

export const IconDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TIcon,

		extends: ComponentViewDescriptor(),

		contribution: {
			props: {
				size: { type: String, triggers: ['change:size'] },
				width: { type: [String, Number], triggers: ['change:width'] },
				height: { type: [String, Number], triggers: ['change:height'] },
			},
		},

		// Иконка декоративна, пока ей не дали имя; с именем она обязана стать
		// `role="img"` — эту роль и передаём плагину.
		plugins: [IconLayoutPluginDescriptor, AriaPluginDescriptor.with({ role: 'img' })],
	}),
)
