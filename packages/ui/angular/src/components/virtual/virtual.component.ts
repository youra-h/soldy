import { Component, ChangeDetectionStrategy } from '@angular/core'
import type { IVirtual } from '@soldy-ui/core'
import { provideElevator, type TBinding } from '../../adapter'
import { TVirtualSurface, VirtualInputNames } from './base.component'
import { setupVirtual } from './setup.component'

/**
 * TVirtualComponent — окно для длинных списков: коллекции внутри (ListBox,
 * Table) рисуют только видимые элементы, а на месте остальных — распорки той
 * же высоты. Выключатель — `enabled`.
 *
 * Своего узла у обёртки нет, как у Vue, React, Solid и Svelte: корня у
 * компонента нет вовсе, как у `so-component`, — `TComponentBase` остаётся с
 * корнем по умолчанию, стратегией `'view'` и шаблоном без `#root`, — а шаблон —
 * только содержимое (`<ng-content />`). Элемент компонента Angular всё же
 * ставит, и бокса у него нет — `display: contents` статикой хоста: раскладка
 * вокруг коллекций та же, что без обёртки. Селектор поэтому элементный — к
 * узлу без бокса атрибуты потребителя не относятся.
 *
 * Свой слой лифта обёртка отдаёт поддереву провайдером (`provideElevator()`):
 * подключение к окну её проводка опускает в него при сборке, а коллекция в
 * содержимом — `<so-list-box>`, `<div so-table>` — читает его из слоя при
 * своей. DI идёт по дереву объявлений, поэтому окно видит коллекция, которую
 * потребитель написал внутри `<so-virtual>`.
 *
 * Selector: <so-virtual>
 */
@Component({
	selector: 'so-virtual',
	standalone: true,
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { style: 'display: contents' },
	template: '<ng-content />',
})
export class TVirtualComponent extends TVirtualSurface<IVirtual> {
	constructor() {
		super(VirtualInputNames)
	}

	protected createBinding(ctrl: IVirtual | undefined, inputs: object): TBinding<IVirtual> {
		return setupVirtual(ctrl, inputs)
	}
}
