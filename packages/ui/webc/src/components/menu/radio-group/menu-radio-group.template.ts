/**
 * Шаблон группы переключателей — разметка группы меню (`menu-group.template.ts`).
 * Роли `radiogroup` нет: в меню группа переключателей — `group` (APG).
 */

import type { IMenuRadioGroup } from '@soldy-ui/core'
import { bind, type ITemplate } from '../../../adapter'
import { createGroup, labelAttributes, showLabel } from '../group/menu-group.template'

export const menuRadioGroupTemplate: ITemplate<IMenuRadioGroup> = {
	create: createGroup,

	bindings: [
		bind('label', ({ root, state }) => showLabel(root, state.label)),
		bind('labelAria', ({ root, state }) => labelAttributes(root, state.labelAria)),
	],
}
