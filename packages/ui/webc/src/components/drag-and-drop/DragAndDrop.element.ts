/**
 * `<so-drag-and-drop>` — перестановка элементов коллекций перетаскиванием:
 * элементы Tabs, ListBox и Accordion в его свете переставляют жестом, а о
 * перестановке сообщают события элемента — `so:move:before` (отмена —
 * `preventDefault()` события) и `so:move`.
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
 * Разметку, ожившую при регистрации, база собирает по месту (`deferral.ts`):
 * обёртка — раньше коллекций в ней, и они её находят.
 *
 * Разметка вынесена в drag-and-drop.template.ts, жизненный цикл — в ElementBase.
 */

import { DragAndDropDescriptor } from '@soldy-ui/setup'
import { ElementBase } from '../../adapter'
import type { TElementType } from '../../adapter'
import { defineAutonomousElement } from '../../adapter/runtime/defineElement'
import { setupDragAndDrop } from './setup.component'
import { dragAndDropTemplate } from './drag-and-drop.template'

export const TDragAndDropElement = ElementBase(HTMLElement, {
	descriptor: DragAndDropDescriptor,
	template: dragAndDropTemplate,
	setup: setupDragAndDrop,
})

defineAutonomousElement('so-drag-and-drop', TDragAndDropElement)

/**
 * `<so-drag-and-drop>` из JS: элемент HTML, своё элемента soldy (`ctrl`,
 * `state`) и свойства пропов дескриптора — без `HOST_PROPS`
 * (`TElementProps`).
 */
export type TDragAndDropElementProps = TElementType<typeof TDragAndDropElement>
