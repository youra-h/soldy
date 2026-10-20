/**
 * Шаблон DragAndDrop.
 *
 * Структуры нет: коллекции — слот `default` — остаются прямо в элементе, как
 * у окна `<so-virtual>`, а своей коробки у элемента нет (`displayContents`):
 * дети раскладываются его родителем, как будто обёртки нет, — у Vue и React у
 * неё нет и узла. Свой экземпляр коллекциям опускает сборка
 * (`setupDragAndDrop`), а не разметка, поэтому привязок нет.
 */

import type { IDragAndDrop } from '@soldy-ui/core'
import type { ITemplate } from '../../adapter'
import { displayContents } from '../../adapter/runtime/display-contents'

export const dragAndDropTemplate: ITemplate<IDragAndDrop> = {
	create: (root) => {
		displayContents(root)

		return { slots: { default: { mode: 'append', node: root } } }
	},

	bindings: [],
}
