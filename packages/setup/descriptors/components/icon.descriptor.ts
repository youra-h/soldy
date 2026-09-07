/**
 * Дескриптор Icon (TIcon).
 *
 * Наследует ComponentViewDescriptor (rendered, visible, present, tag, classes, element, instance)
 * и добавляет size, width, height + плагин IconStyle.
 */

import { defineComponent } from '../base'
import { TIcon } from '@soldy/core'
import type { IIconProps, TIconEvents } from '@soldy/core'
import { IconLayoutPluginDescriptor, AriaPluginDescriptor } from '../plugins'
import { IconContribution } from '../../contributions'
import { ComponentViewDescriptor } from './component-view.descriptor'

export const IconDescriptor = () =>
	defineComponent<IIconProps, TIconEvents>()({
		ctor: TIcon,

		extends: ComponentViewDescriptor(),

		contribution: IconContribution(),

		// Иконка декоративна, пока ей не дали имя; с именем она обязана стать
		// `role="img"` — эту роль и передаём плагину.
		plugins: [IconLayoutPluginDescriptor(), AriaPluginDescriptor({ role: 'img' })],
	})
