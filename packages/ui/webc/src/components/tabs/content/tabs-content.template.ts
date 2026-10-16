/**
 * Шаблон панели таба.
 *
 * Структуры нет: содержимое панели — слот `default` — остаётся прямо в корне,
 * в самом `<div is="so-tabs-content">`. Классы, `attrs` и `aria` панели
 * (`role="tabpanel"`, `id` и `aria-labelledby` от её таба) раскладывает на
 * корень база (`SoldyElement`), и она же прячет неактивную панель: описание
 * корня называет выход `active` фасада, без которого корня нет (`shownBy`), —
 * убрать элемент потребителя компонент не может.
 *
 * Содержимое неактивной панели — вне документа (`showSlot`), как у Vue, где
 * неактивная панель не рисуется: поля в нём не уходят с формой, а элементы
 * soldy отключаются, как при перестановке. Показ — переносом силами базы.
 */

import type { ITabsContent, TTabsContentCollectionFacade } from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import { bind, type ITemplate } from '../../../adapter'

export const tabsContentTemplate: ITemplate<ITabsContent, TTabsContentCollectionFacade> = {
	create: (root) => ({ slots: { default: { mode: 'append', node: root } } }),

	bindings: [
		bind('active', ({ state, showSlot }) => {
			showSlot(DEFAULT_SLOT, state.active === true)
		}),
	],
}
