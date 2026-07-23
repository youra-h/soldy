/**
 * Дескриптор Icon (TIcon).
 *
 * Наследует ComponentViewDescriptor (rendered, visible, present, tag, classes, element, instance)
 * и добавляет size, width, height + плагин IconStyle.
 */

import { defineComponent, definePlugin } from '../base'
import { TIcon } from '@soldy/core'
import { TIconStylesPlugin } from '@soldy/plugins'
import { IconContribution, IconStylesContribution } from '../../contributions'
import { ComponentViewDescriptor } from './component-view.descriptor'

export const IconDescriptor = defineComponent({
	ctor: TIcon,

	extends: ComponentViewDescriptor,

	contribution: IconContribution,

	plugins: [
		definePlugin({
			ctor: TIconStylesPlugin,
			contribution: IconStylesContribution,
		}),
	],
})
