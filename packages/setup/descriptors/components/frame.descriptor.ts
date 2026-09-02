/**
 * Дескриптор Frame (TFrame).
 *
 * Наследует ComponentDescriptor (rendered, visible, present)
 * и добавляет x, y, width, height, position, target, zIndex + плагины element, instance, ready, frame-style.
 *
 * В отличие от ComponentViewDescriptor, TFrame не использует TStylable (нет size/variant).
 * Но ему нужны плагины element/instance/ready как у ComponentViewDescriptor.
 */

import { defineComponent, definePlugin } from '../base'
import { TFrame } from '@soldy/core'
import { TElementPlugin, TInstancePlugin, TReadyPlugin, TFrameStylesPlugin } from '@soldy/plugins'
import {
	FrameContribution,
	FrameStylesContribution,
	ElementContribution,
	InstanceContribution,
} from '../../contributions'
import { ComponentDescriptor } from './component.descriptor'

export const FrameDescriptor = defineComponent({
	ctor: TFrame,

	extends: ComponentDescriptor,

	contribution: FrameContribution,

	plugins: [
		definePlugin({
			ctor: TElementPlugin,
			contribution: ElementContribution,
		}),
		definePlugin({
			ctor: TInstancePlugin,
			contribution: InstanceContribution,
		}),
		definePlugin({
			ctor: TReadyPlugin,
		}),
		definePlugin({
			ctor: TFrameStylesPlugin,
			contribution: FrameStylesContribution,
		}),
	],
})
