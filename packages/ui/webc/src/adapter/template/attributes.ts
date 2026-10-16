/**
 * Набор ядра на элементе шаблона — функцией шаблона, а не базы.
 *
 * Свои наборы база кладёт на корень (`SoldyElement`). Набор, которому место на
 * элементе шаблона, — `aria` поля на `<input>`, `clearAria` поля на кнопке
 * очистки, — кладёт сам шаблон: функцией `ownerAttributes`, тем же правилом,
 * что база на корне (`root-attributes.ts`). Пишет она верхний слой
 * раскладчика элемента (`TElementAttributes`): когда элемент — корень
 * вложенного компонента, набор владельца главнее того, что компонент пишет
 * себе сам, как атрибут снаружи у Vue и React, при любом порядке, в каком они
 * пишут. Значение потребителя на элементе — перенесённое с корня поля
 * (`aria-label`) — главнее набора, как на корне.
 */

import type { TAttributesMap } from '@soldy-ui/core'
import { TElementAttributes } from '../runtime/root-attributes'

/** Набор владельца на элементе его шаблона; набора нет — пустой. */
export function ownerAttributes(element: Element, set: TAttributesMap | undefined): void {
	TElementAttributes.of(element).set('owner', set ?? {})
}
