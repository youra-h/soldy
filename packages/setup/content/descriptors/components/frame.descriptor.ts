/**
 * Дескриптор Frame (TFrame).
 *
 * Наследует LayerDescriptor: Frame — слой поверх страницы, ему нужны
 * rendered/visible/present, tag, classes, плагины element/ready, цель
 * телепорта и номер в общем стеке. Раньше он наследовал ComponentDescriptor и
 * дублировал эти плагины, потому что ComponentViewDescriptor ошибочно
 * считался приносящим size/variant — те объявлены ниже по цепочке, в
 * StylableDescriptor.
 *
 * Добавляет x, y, width, height, position + плагины раскладки, якоря и имени.
 */

import { defineComponent, defineDescriptor } from '../../../protected/define'
import { TFrame } from '@soldy-ui/core'
import {
	FrameLayoutPluginDescriptor,
	AnchorPluginDescriptor,
	AriaPluginDescriptor,
} from '../plugins'
import { LayerDescriptor } from './layer.descriptor'

export const FrameDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TFrame,

		extends: LayerDescriptor(),

		contribution: {
			props: {
				x: { type: Number, triggers: ['change:x'] },
				y: { type: Number, triggers: ['change:y'] },
				width: { type: [Number, String], triggers: ['change:width'] },
				height: { type: [Number, String], triggers: ['change:height'] },
				position: { type: String, triggers: ['change:position'] },
			},
		},

		plugins: [FrameLayoutPluginDescriptor, AnchorPluginDescriptor, AriaPluginDescriptor],
	}),
)
