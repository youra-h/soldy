/**
 * Дескриптор Layer (TLayer) — слой поверх страницы.
 *
 * Наследует ComponentViewDescriptor (rendered, visible, tag, наборы и плагины
 * element/ready) и добавляет то, что у всех слоёв общее: цель телепорта
 * (`target`) и подъём в общем стеке (`change:zIndex`). Раскладки у слоя нет —
 * её приносят наследники: Frame — координатами и плагинами якоря, модальное
 * окно — местом и размером, которые раскладывает тема.
 */

import { defineComponent, defineDescriptor } from '../../../protected/define'
import { TLayer } from '@soldy-ui/core'
import { ComponentViewDescriptor } from './component-view.descriptor'

export const LayerDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TLayer,

		extends: ComponentViewDescriptor(),

		contribution: {
			props: {
				target: { type: [Object, String], triggers: ['change:target'] },
			},
			events: ['change:zIndex'],
		},
	}),
)
