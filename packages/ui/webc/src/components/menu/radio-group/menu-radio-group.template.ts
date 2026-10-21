/**
 * Шаблон группы переключателей меню, как `RadioGroup.vue` у Vue: разметка —
 * та же, что у группы меню (`menu-group.template.ts`), переключатели под
 * общей подписью, и рисуют её те же функции.
 *
 * Корень — сам `<div is="so-menu-radio-group">`: классы и три набора ядра —
 * `role="group"` и `aria-labelledby` на подпись — раскладывает на него база.
 * Роли `radiogroup` нет: в меню группа переключателей — `group` (APG).
 * Переключатели входят в коллекцию меню сквозь группу, и навигация ходит по
 * ним, как по одному списку.
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
