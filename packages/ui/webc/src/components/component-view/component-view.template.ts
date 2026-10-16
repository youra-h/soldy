/**
 * Шаблон ComponentView.
 *
 * Структуры нет вовсе: пользовательское содержимое остаётся прямо в корне — в
 * самом `<div is="so-component-view">`. Классы, наборы `aria`, `attrs` (в т.ч. `dir`) и
 * `dataset` и скрытие по `rendered` и `visible` раскладывает на корень база
 * (`SoldyElement`): сам ComponentView в наборы не пишет, но наследники (Icon,
 * Skeleton, …) пишут, и база доносит запись до DOM у любого компонента.
 */

import type { IComponentView } from '@soldy-ui/core'
import type { ITemplate } from '../../adapter'

export const componentViewTemplate: ITemplate<IComponentView> = {
	create: (root) => ({ slots: { default: { mode: 'append', node: root } } }),

	bindings: [],
}
