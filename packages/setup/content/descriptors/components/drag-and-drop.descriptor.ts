/**
 * Дескриптор DragAndDrop (TDragAndDrop).
 *
 * Наследует ComponentDescriptor (невизуальная база) и добавляет слот по
 * умолчанию. Новых props/events нет — только drag-контекст детям.
 */

import { defineComponent, defineDescriptor } from '../../../protected/define'
import { TDragAndDrop } from '@soldy-ui/core'
import { ComponentDescriptor } from './component.descriptor'

export const DragAndDropDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TDragAndDrop,

		extends: ComponentDescriptor(),

		contribution: {
			/**
			 * Своего узла у компонента нет: разметка — один слот, и drag-контекст
			 * получают коллекции внутри него. Слот объявлен здесь, а не взят у
			 * ComponentView: визуального слоя у DragAndDrop нет.
			 */
			slots: {
				default: { description: 'Коллекции, между которыми перетаскивают элементы' },
			},
		},
	}),
)
