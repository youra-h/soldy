/** Шаблон Virtual: структуры и коробки нет (`displayContents`); окно коллекциям опускает сборка. */

import type { IVirtual } from '@soldy-ui/core'
import type { ITemplate } from '../../adapter'
import { displayContents } from '../../adapter/runtime/display-contents'

export const virtualTemplate: ITemplate<IVirtual> = {
	create: (root) => {
		displayContents(root)

		return { slots: { default: { mode: 'append', node: root } } }
	},

	bindings: [],
}
