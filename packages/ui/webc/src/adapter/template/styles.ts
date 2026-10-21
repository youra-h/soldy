/**
 * Стиль значением на узле шаблона — функцией шаблона, по правилу базы.
 *
 * Свой стиль база кладёт на корень (`SoldyElement`). Стиль, которому место на
 * узле шаблона, — позиция ручки и метки Slider (`thumb.style`, `mark.style`),
 * края его заливки (`rangeStyle`), доля заливки звезды Rating
 * (`star.style`), высота и место распорки окна ListBox и Table, `z-index`
 * подложки окна и выезжающей панели (`layout_backdropStyles`), — кладёт сам
 * шаблон: функцией `ownerStyles`, тем же правилом, что база на корне
 * (`applyStyles`, `root-attributes.ts`). Своё значение она пишет и снимает, а
 * чужое не трогает: свойство, которое плагин или потребитель записал в узел
 * сам, переживает смену записи. Память — у узла, как у раскладчика его
 * атрибутов (`ownerAttributes`): каждый вызов кладёт стиль новой записи
 * поверх прежнего, и свойство, ушедшее из записи, снимается.
 *
 * Тем же правилом шаблон кладёт стиль и на свой корень, когда значение не
 * стиль-выход ядра, а запись разметки: глубину тоста в стопке
 * (`--so-toasts-depth` из `order` фасада), как `:style` корня тоста у Vue.
 * Память у шаблона своя, а свойства с базой у него разные.
 *
 * Стиль — объект `имя → значение` с именами, как в CSS
 * (`--so-slider-position`, `z-index`): так его отдают ядро и плагины, и на
 * узел имена уходят как есть, а число — строкой (`stylesOf`).
 */

import { applyStyles, stylesOf, type TAppliedStyles } from '../runtime/root-attributes'

/** Что из стиля поставил шаблон на узел в прошлый раз. */
const applied = new WeakMap<Element, TAppliedStyles>()

/** Стиль владельца на элементе его шаблона; стиля нет — своё снято. */
export function ownerStyles(
	element: HTMLElement,
	style: Readonly<Record<string, string | number>> | undefined,
): void {
	applied.set(element, applyStyles(element, stylesOf(style), applied.get(element) ?? new Map()))
}
