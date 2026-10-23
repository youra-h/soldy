/** Шаблон Frame: структуры нет, содержимое остаётся в корне и уезжает в цель с ним. */

import type { IFrame } from '@soldy-ui/core'
import type { ITemplate } from '../../adapter'

export const frameTemplate: ITemplate<IFrame> = {
	create: (root) => ({ slots: { default: { mode: 'append', node: root } } }),

	bindings: [],
}
