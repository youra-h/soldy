import { Directive } from '@angular/core'
import type { IVirtual } from '@soldy-ui/core'
import { provideElevator, type TBinding } from '../../adapter'
import { TVirtualSurface, VirtualInputNames } from './base.component'
import { setupVirtual } from './setup.component'

/**
 * TVirtualComponent — окно для длинных списков: коллекции внутри (ListBox,
 * Table) рисуют только видимые элементы, а на месте остальных — распорки той
 * же высоты. Выключатель — `enabled`.
 *
 * Своего узла у окна нет, как у Vue, React, Solid и Svelte: корня у
 * компонента нет вовсе, как у `so-component`, — `TComponentBase` остаётся с
 * корнем по умолчанию, стратегией `'view'` без `#root`. Поэтому компонент —
 * директива, а не компонент Angular, и пишется атрибутом на `<ng-container>`,
 * как провайдер локали:
 *
 * ```html
 * <ng-container so-virtual [enabled]="enabled">
 * 	<div so-list-box [items]="items"></div>
 * </ng-container>
 * ```
 *
 * Шаблона у директивы нет, и содержимое остаётся там, где его написал
 * потребитель: раскладка вокруг коллекций та же, что без окна, а на месте
 * контейнера Angular ставит только комментарий-якорь.
 *
 * Свой слой лифта окно отдаёт поддереву провайдером (`provideElevator()`):
 * подключение к окну его проводка опускает в него при сборке, а коллекция в
 * содержимом — `<div so-list-box>`, `<div so-table>` — читает его из слоя при
 * своей. DI идёт по дереву объявлений, а у `<ng-container>` свой инжектор,
 * поэтому окно видит коллекция, которую потребитель написал внутри
 * `<ng-container so-virtual>`. Сборка окна — в его `ngOnInit`, а он идёт
 * раньше хуков содержимого: Angular зовёт хуки в порядке шаблона.
 *
 * Selector: [so-virtual]
 */
@Directive({
	selector: '[so-virtual]',
	standalone: true,
	providers: [provideElevator()],
})
export class TVirtualComponent extends TVirtualSurface<IVirtual> {
	constructor() {
		super(VirtualInputNames)
	}

	protected createBinding(ctrl: IVirtual | undefined, inputs: object): TBinding<IVirtual> {
		return setupVirtual(ctrl, inputs)
	}
}
