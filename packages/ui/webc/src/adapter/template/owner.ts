/**
 * Наборы, классы и стиль значением на узлах шаблона — тем же правилом, что
 * база на корне (`runtime/paint.ts`), слоем владельца: когда узел — корень
 * вложенного компонента, написанное владельцем лежит поверх того, что
 * компонент пишет себе сам. Каждый вызов заменяет слой владельца целиком,
 * поэтому несколько наборов на один узел кладутся одним вызовом.
 */

import type { TAttributesMap } from '@soldy-ui/core'
import { TElementAttributes, TPaint, stylesOf } from '../runtime/paint'

/** У детали с полем набор уходит на поле: `aria` Select — на `<input>` детали Input. */
export function ownerAttributes(element: Element, set: TAttributesMap | undefined): void {
	TElementAttributes.of(element).set('owner', set ?? {})
}

/** Классы части без своего экземпляра: панели меню и подменю. */
export function ownerClasses(element: HTMLElement, classes: readonly string[] | undefined): void {
	TPaint.of(element).classes('owner', classes ?? [])
}

export function ownerStyles(
	element: HTMLElement,
	style: Readonly<Record<string, string | number>> | undefined,
): void {
	TPaint.of(element).styles('owner', stylesOf(style))
}
