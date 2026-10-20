/**
 * Дескриптор DragAndDrop (TDragAndDrop).
 *
 * Наследует ComponentDescriptor (невизуальная база) и добавляет события
 * перестановки жестом и слот по умолчанию. Пропсов своих нет: обёртка опускает
 * себя коллекциям внутри (`TDragAndDropExtension`), а те подхватывают её своим
 * расширением (`TDragAndDropCollectionExtension`).
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
			 * Перестановка элемента жестом: `move:before` — до неё, отменяется
			 * `preventDefault()`, `move` — после, с местом, где элемент встал
			 */
			events: ['move:before', 'move'],
			/**
			 * Своего узла у компонента нет: разметка — один слот, и перестановку
			 * получают коллекции внутри него. Слот объявлен здесь, а не взят у
			 * ComponentView: визуального слоя у DragAndDrop нет.
			 */
			slots: {
				default: {
					description: 'Коллекции, элементы которых переставляют перетаскиванием',
				},
			},
		},
	}),
)
