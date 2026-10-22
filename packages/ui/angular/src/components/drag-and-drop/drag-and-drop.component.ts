import { Directive } from '@angular/core'
import type { IDragAndDrop } from '@soldy-ui/core'
import { provideElevator } from '../../adapter'
import { TDragAndDropSurface } from '../../generated/drag-and-drop.metadata'
import { setupDragAndDrop } from './setup.component'

/**
 * TDragAndDropComponent — перестановка элементов коллекций перетаскиванием:
 * элементы Tabs, ListBox и Accordion внутри переставляют жестом, а о
 * перестановке сообщают выходы обёртки — `(soMoveBefore)` (отмена —
 * `$event.preventDefault()`) и `(soMove)`.
 *
 * Своего узла у обёртки нет, как у Vue, React, Solid и Svelte: корня у
 * компонента нет вовсе, как у `so-virtual`, — `TComponentBase` остаётся с
 * корнем по умолчанию, стратегией `'view'` без `#root`. Поэтому компонент —
 * директива, а не компонент Angular, и пишется атрибутом на `<ng-container>`,
 * как провайдер локали:
 *
 * ```html
 * <ng-container so-drag-and-drop (soMove)="moved($event)">
 * 	<div so-tabs>…</div>
 * 	<div so-list-box [items]="items"></div>
 * </ng-container>
 * ```
 *
 * Шаблона у директивы нет, и содержимое остаётся там, где его написал
 * потребитель: раскладка вокруг коллекций та же, что без обёртки, а на месте
 * контейнера Angular ставит только комментарий-якорь.
 *
 * Свой слой лифта обёртка отдаёт поддереву провайдером (`provideElevator()`):
 * свой экземпляр её проводка опускает в него при сборке, а коллекция в
 * содержимом — `<div so-list-box>`, `<div so-tabs>`, `<div so-accordion>` — читает его
 * из слоя при своей. DI идёт по дереву объявлений, а у `<ng-container>` свой
 * инжектор, поэтому обёртку видит коллекция, которую потребитель написал
 * внутри `<ng-container so-drag-and-drop>`.
 *
 * Selector: [so-drag-and-drop]
 */
@Directive({
	selector: '[so-drag-and-drop]',
	providers: [provideElevator()],
})
export class TDragAndDropComponent extends TDragAndDropSurface<IDragAndDrop> {
	constructor() {
		super(setupDragAndDrop)
	}
}
