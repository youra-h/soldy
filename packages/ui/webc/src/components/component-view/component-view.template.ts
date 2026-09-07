/**
 * Шаблон ComponentView.
 *
 * Структуры нет вовсе: пользовательское содержимое кладётся прямо в корень.
 * Всё остальное — `rendered`, `tag`, `classes`, `visible` — структурные props,
 * их применяет базовый класс, поэтому привязок здесь ноль.
 */

import type { ITemplate } from '../../adapter'

export const componentViewTemplate: ITemplate = {
	tag: (state) => String(state.tag ?? 'div'),

	create: (root) => root,

	bindings: [],
}
