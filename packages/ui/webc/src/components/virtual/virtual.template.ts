/**
 * Шаблон Virtual.
 *
 * Структуры нет: коллекции — слот `default` — остаются прямо в элементе, как
 * содержимое панели у Frame, а своей коробки у элемента нет
 * (`displayContents`): дети раскладываются его родителем, как будто обёртки
 * нет, — у Vue и React у неё нет и узла. Окно коллекциям опускает сборка
 * (`setupVirtual`), а не разметка, поэтому привязок нет.
 */

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
