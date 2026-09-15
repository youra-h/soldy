/**
 * Шаблон ComponentView.
 *
 * Структуры нет вовсе: пользовательское содержимое кладётся прямо в корень.
 * `rendered`, `tag`, `classes`, `visible`, `attrs` (в т.ч. `dir`) — структурные
 * props, их применяет базовый класс. `aria`/`dataset` — нет: сам по себе
 * ComponentView в них не пишет, но наследники (Icon, Spinner, …) пишут, и без
 * привязки здесь запись до DOM не доходит.
 */

import type { IComponentView } from '@soldy/core'
import { ariaBinding, datasetBinding, type ITemplate } from '../../adapter'

export const componentViewTemplate: ITemplate<IComponentView> = {
	tag: (state) => String(state.tag ?? 'div'),

	create: (root) => ({ default: { mode: 'append', node: root } }),

	bindings: [ariaBinding, datasetBinding],
}
