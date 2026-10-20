/**
 * `<so-drag-and-drop>` — перестановка элементов коллекций перетаскиванием:
 * элементы Tabs, ListBox и Accordion в его свете переставляют жестом, а о
 * перестановке сообщают события элемента — `so:move:before` (отмена —
 * `detail.preventDefault()`) и `so:move`.
 *
 * Элемент — автономный, а не встроенный, как окно `<so-virtual>`: у Vue и
 * React обёртка `DragAndDrop` своего узла не рисует, и расширять ей нечего —
 * ни тега, ни нативного поведения. Поэтому пишется она своим тегом, без `is`,
 * и коробки у неё нет (`displayContents`): дети раскладываются её родителем,
 * как без обёртки. Узел в дереве документа при этом есть, и селектор с
 * дочерним комбинатором (`.panel > .so-list-box`) через него не проходит.
 *
 * Компонент невизуальный: классов, наборов и видимости у ядра нет, и база
 * ничего на элемент не кладёт. Свой экземпляр коллекциям в свете элемента
 * опускает сборка — лифтом его хосту (`setupDragAndDrop`). Пропсов своих нет.
 *
 * Регистрируется раньше коллекций (`components/index.ts`): при апгрейде
 * разметки элемент, зарегистрированный раньше, собирается раньше, и коллекции
 * в обёртке его находят.
 *
 * Разметка вынесена в drag-and-drop.template.ts, жизненный цикл — в SoldyElement.
 */

import { DragAndDropDescriptor } from '@soldy-ui/setup'
import type { IDragAndDrop } from '@soldy-ui/core'
import { SoldyElement } from '../../adapter'
import type { ISoldyElement, TSoldyElementProps } from '../../adapter'
import { defineAutonomousElement } from '../../adapter/runtime/defineElement'
import { setupDragAndDrop } from './setup.component'
import { dragAndDropTemplate } from './drag-and-drop.template'

export const TDragAndDropElement = SoldyElement(HTMLElement, {
	descriptor: DragAndDropDescriptor(),
	template: dragAndDropTemplate,
	setup: setupDragAndDrop,
})

defineAutonomousElement('so-drag-and-drop', TDragAndDropElement)

/**
 * `<so-drag-and-drop>` из JS: элемент HTML, своё элемента soldy (`ctrl`,
 * `state`) и свойства пропов дескриптора — без `HOST_PROPS`
 * (`TSoldyElementProps`).
 */
export type TDragAndDropElementProps = HTMLElement &
	ISoldyElement<IDragAndDrop> &
	TSoldyElementProps<typeof DragAndDropDescriptor, HTMLElement>
