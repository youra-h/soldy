/**
 * Шаблон разделителя меню — линии между группами пунктов, как `Separator.vue`
 * у Vue.
 *
 * Корень — сам `<div is="so-menu-separator">`: классы и наборы —
 * `role="separator"` от ядра — раскладывает на него база (`ElementBase`).
 * Внутри ничего не рисуется, и слотов у разделителя нет: содержимое элемента
 * не выводится. Навигация его пропускает — в коллекцию меню разделитель не
 * входит.
 */

import type { TMenuSeparator } from '@soldy-ui/core'
import type { ITemplate } from '../../../adapter'

export const menuSeparatorTemplate: ITemplate<TMenuSeparator> = {
	create: () => ({ slots: {} }),

	bindings: [],
}
