/**
 * Дескриптор Frame (TFrame).
 *
 * Наследует ComponentDescriptor (rendered, visible, present)
 * и добавляет x, y, width, height, position, target, zIndex + плагины element, instance, ready, frame-style.
 *
 * В отличие от ComponentViewDescriptor, TFrame не использует TStylable (нет size/variant).
 * Но ему нужны плагины element/instance/ready как у ComponentViewDescriptor.
 */

import { defineComponent } from '../base'
import { TFrame } from '@soldy/core'
import {
	ElementPluginDescriptor,
	ReadyPluginDescriptor,
	FrameLayoutPluginDescriptor,
} from '../plugins'
import { FrameContribution } from '../../contributions'
import { ComponentDescriptor } from './component.descriptor'

export const FrameDescriptor = () =>
	defineComponent({
		ctor: TFrame,

		extends: ComponentDescriptor(),

		contribution: FrameContribution(),

		plugins: [
			ElementPluginDescriptor(),
			ReadyPluginDescriptor(),
			FrameLayoutPluginDescriptor(),
		],
	})
