/** Шаблон ComponentView: структуры нет, содержимое остаётся в корне. */

import type { IComponentView } from '@soldy-ui/core'
import type { ITemplate } from '../../adapter'

export const componentViewTemplate: ITemplate<IComponentView> = {
	create: (root) => ({ slots: { default: { mode: 'append', node: root } } }),

	bindings: [],
}
