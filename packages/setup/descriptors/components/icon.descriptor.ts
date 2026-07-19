/**
 * Дескриптор Icon (TIcon).
 *
 * Наследует ComponentViewDescriptor (rendered, visible, present, tag, classes, element, instance)
 * и добавляет size, width, height + плагин IconStyle (styles).
 */

import { defineComponent, definePlugin } from '../define-component'
import { TObservingAccessorProvider } from '../../providers/components'
import { TIcon } from '@soldy/core'
import { TIconStylePlugin } from '@soldy/plugins'
import { IconContribution } from '../../contributions/components/icon'
import { ComponentViewDescriptor } from './component-view.descriptor'

export const IconDescriptor = defineComponent({
	ctor: TIcon,

	extends: ComponentViewDescriptor,

	contribution: IconContribution,

	plugins: [
		...ComponentViewDescriptor.plugins,
		definePlugin({
			plugin: TIconStylePlugin,
		}),
	],

	provider: TObservingAccessorProvider,
})
