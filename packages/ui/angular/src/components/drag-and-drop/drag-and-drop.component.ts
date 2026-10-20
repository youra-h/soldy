import { Component, ChangeDetectionStrategy } from '@angular/core'
import type { IDragAndDrop } from '@soldy-ui/core'
import { provideElevator, type TBinding } from '../../adapter'
import { DragAndDropInputNames, TDragAndDropSurface } from './base.component'
import { setupDragAndDrop } from './setup.component'

/**
 * TDragAndDropComponent — перестановка элементов коллекций перетаскиванием:
 * элементы Tabs, ListBox и Accordion внутри переставляют жестом, а о
 * перестановке сообщают выходы обёртки — `(soMoveBefore)` (отмена —
 * `$event.preventDefault()`) и `(soMove)`.
 *
 * Своего узла у обёртки нет, как у Vue, React, Solid и Svelte: корня у
 * компонента нет вовсе, как у `so-virtual`, — `TComponentBase` остаётся с
 * корнем по умолчанию, стратегией `'view'` и шаблоном без `#root`, — а шаблон —
 * только содержимое (`<ng-content />`). Элемент компонента Angular всё же
 * ставит, и бокса у него нет — `display: contents` статикой хоста: раскладка
 * вокруг коллекций та же, что без обёртки. Селектор поэтому элементный — к
 * узлу без бокса атрибуты потребителя не относятся.
 *
 * Свой слой лифта обёртка отдаёт поддереву провайдером (`provideElevator()`):
 * свой экземпляр её проводка опускает в него при сборке, а коллекция в
 * содержимом — `<so-list-box>`, `<so-tabs>`, `<div so-accordion>` — читает его
 * из слоя при своей. DI идёт по дереву объявлений, поэтому обёртку видит
 * коллекция, которую потребитель написал внутри `<so-drag-and-drop>`.
 *
 * Selector: <so-drag-and-drop>
 */
@Component({
	selector: 'so-drag-and-drop',
	standalone: true,
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { style: 'display: contents' },
	template: '<ng-content />',
})
export class TDragAndDropComponent extends TDragAndDropSurface<IDragAndDrop> {
	constructor() {
		super(DragAndDropInputNames)
	}

	protected createBinding(
		ctrl: IDragAndDrop | undefined,
		inputs: object,
	): TBinding<IDragAndDrop> {
		return setupDragAndDrop(ctrl, inputs)
	}
}
