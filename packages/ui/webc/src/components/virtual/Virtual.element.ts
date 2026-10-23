/**
 * `<so-virtual>` — окно для длинных списков: коллекции внутри (ListBox, Table)
 * рисуют только видимые элементы, а на месте остальных — распорки.
 *
 * Элемент — автономный, а не встроенный, как провайдер локали
 * `<so-locale-provider>`: у Vue и React обёртка `Virtual` своего узла не
 * рисует, и расширять ей нечего — ни тега, ни нативного поведения. Поэтому
 * пишется она своим тегом, без `is`, и коробки у неё нет
 * (`displayContents`): дети раскладываются её родителем, как без обёртки.
 * Узел в дереве документа при этом есть, и селектор с дочерним комбинатором
 * (`.panel > .so-list-box`) через него не проходит.
 *
 * Компонент невизуальный: классов, наборов и видимости у ядра нет, и база
 * ничего на элемент не кладёт. Окно коллекциям в свете элемента опускает
 * сборка — лифтом его хосту (`setupVirtual`). Выключатель — `enabled`, по
 * умолчанию включено: выключают его из кода (`el.enabled = false`) — у флага
 * значимо наличие атрибута, и `enabled` в разметке окно только включает.
 *
 * Разметку, ожившую при регистрации, база собирает по месту (`deferral.ts`):
 * окно — раньше списков в нём, и они его находят.
 *
 * Разметка вынесена в virtual.template.ts, жизненный цикл — в ElementBase.
 */

import { VirtualDescriptor } from '@soldy-ui/setup'
import type { IVirtual } from '@soldy-ui/core'
import { ElementBase } from '../../adapter'
import type { IElementBase, TElementProps } from '../../adapter'
import { defineAutonomousElement } from '../../adapter/runtime/defineElement'
import { setupVirtual } from './setup.component'
import { virtualTemplate } from './virtual.template'

export const TVirtualElement = ElementBase(HTMLElement, {
	descriptor: VirtualDescriptor(),
	template: virtualTemplate,
	setup: setupVirtual,
})

defineAutonomousElement('so-virtual', TVirtualElement)

/**
 * `<so-virtual>` из JS: элемент HTML, своё элемента soldy (`ctrl`, `state`) и
 * свойства пропов дескриптора (`enabled`) — без `HOST_PROPS`
 * (`TElementProps`).
 */
export type TVirtualElementProps = HTMLElement &
	IElementBase<IVirtual> &
	TElementProps<typeof VirtualDescriptor, HTMLElement>
