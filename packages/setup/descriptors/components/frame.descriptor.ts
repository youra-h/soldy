/**
 * Дескриптор Frame (TFrame).
 *
 * Наследует ComponentViewDescriptor: Frame — визуальный компонент, ему нужны
 * rendered/visible/present, tag, classes и плагины element/ready. Раньше он
 * наследовал ComponentDescriptor и дублировал эти плагины, потому что
 * ComponentViewDescriptor ошибочно считался приносящим size/variant — те
 * объявлены ниже по цепочке, в StylableDescriptor.
 *
 * Добавляет x, y, width, height, position, target, zIndex + frame-layout плагин.
 */

import { defineComponent, defineDescriptor } from '../../define'
import { TFrame } from '@soldy/core'
import {
	FrameLayoutPluginDescriptor,
	AnchorPluginDescriptor,
	AriaPluginDescriptor,
} from '../plugins'
import { ComponentViewDescriptor } from './component-view.descriptor'

export const FrameDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TFrame,

		extends: ComponentViewDescriptor(),

		contribution: {
			props: {
				x: { type: Number, triggers: ['change:x'] },
				y: { type: Number, triggers: ['change:y'] },
				width: { type: [Number, String], triggers: ['change:width'] },
				height: { type: [Number, String], triggers: ['change:height'] },
				position: { type: String, triggers: ['change:position'] },
				target: { type: [Object, String], triggers: ['change:target'] },
			},
			events: ['change:zIndex'],
		},

		plugins: [FrameLayoutPluginDescriptor(), AnchorPluginDescriptor(), AriaPluginDescriptor()],
	}),
)
