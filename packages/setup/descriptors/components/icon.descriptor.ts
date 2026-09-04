/**
 * Дескриптор Icon (TIcon).
 *
 * Наследует ComponentViewDescriptor (rendered, visible, present, tag, classes, element, instance)
 * и добавляет size, width, height + плагин IconStyle.
 */

import { defineComponent } from '../base'
import { TIcon } from '@soldy/core'
import type { IIconProps, TIconEvents } from '@soldy/core'
import { IconLayoutPluginDescriptor } from '../plugins'
import { IconContribution } from '../../contributions'
import { ComponentViewDescriptor } from './component-view.descriptor'

export const IconDescriptor = () =>
	defineComponent<IIconProps, TIconEvents>()({
		ctor: TIcon,

		extends: ComponentViewDescriptor(),

		contribution: IconContribution(),

		plugins: [IconLayoutPluginDescriptor()],
	})
