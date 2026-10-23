/** Шаблон DragAndDrop: структуры и коробки нет (`displayContents`); экземпляр опускает сборка. */

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
