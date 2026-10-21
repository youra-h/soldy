import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IToasts, TToastsCollectionFacade } from '@soldy-ui/core'
import { SlotDirective, provideElevator, type TBinding } from '../../adapter'
import { TToastsItemComponent } from './item'
import { ToastsInputNames, TToastsSurface } from './base.component'
import { setupToasts } from './setup.component'

/**
 * TToastsComponent — менеджер всплывающих уведомлений вокруг приложения:
 * тосты приходят из кода, а регион с ними стоит у края окна, поверх слоёв.
 *
 * ```html
 * <div so-toasts placement="bottom-end" class="app-toasts">
 * 	<router-outlet />
 * </div>
 * ```
 *
 * Элемент потребителя (`<div so-toasts>`) — обёртка: приложение в нём —
 * основная проекция, а корень компонента — регион `section` в шаблоне, и в
 * цель `target` (по умолчанию `body`) уезжает он, а на месте в обёртке
 * остаётся якорь. Это корень внутри обёртки со слоем (`'wrapped'` с
 * `teleport` у `TComponentBase`): своей коробки у обёртки нет — место в
 * раскладке у приложения, как будто обёртки нет, — и внешний узел компонента —
 * регион, как у Vue, у которого обёртки нет вовсе. Поэтому всё, что
 * потребитель написал на `div`, — региону: статику, класс и стиль тоже,
 * переносит база, привязки (`[attr.x]`, `[class.x]`, `[style.x]`) и слушатели
 * — рендерер адаптера (`provideAttrs()`), как `$attrs` региона у Vue. На `div`
 * остаётся только своё: `display: contents`, селектор и служебные атрибуты
 * Angular. `visible` и `rendered` прячут регион, а приложение остаётся на
 * виду.
 *
 * Регион стоит всегда, и пустым: живая область должна быть в документе до
 * первого тоста. На нём классы (место `so-toasts--placement-*`, раскладка
 * `so-toasts--layout-*`), наборы (`role="region"`, `aria-live`, имя от локали,
 * `data-layer`) и `z-index` слоя (`layout_styles`). Слой есть только в
 * браузере, как оверлей CDK: на сервере, до первой отрисовки и без цели
 * региона нет (`@if (placed())`). Гидратация ему не нужна, а приложению нужна:
 * пометки `ngSkipHydration` у менеджера нет, приложение — вне ветки региона.
 *
 * Тост показывает код: `useToasts().show('Сохранено')` в компоненте под
 * менеджером — API лифта менеджера, — или движок, отданный входом `engine`
 * (`engine.extensions.toasts.show`). Контекстов два — свой и фасада коллекции
 * (`setupToasts`), и вход фасада `engine` — вход того же элемента. Свой слой
 * лифта менеджер отдаёт поддереву провайдером (`provideElevator()`): тосты в
 * регионе берут из него движок, а приложение — API тостов.
 *
 * Тост — внутренняя часть `<li so-toasts-item>`, по одному на каждый
 * показанный элемент коллекции (`shown`), новый — первым, петлёй по ключу
 * `uid`. Закрытый тост остаётся в списке, пока гаснет, и уходит из коллекции,
 * когда доиграли переходы его корня. Слоты тоста пробрасываются целиком и
 * только заданные: `item-icon` (scope `{ item, type }`), `item`
 * (`{ item, text }`), `item-content` и `item-close-icon` (`{ item }`) —
 * шаблонами (`<ng-template slot="item-icon" let-item="item" let-type="type">`).
 *
 * Логики здесь нет — см. `setupToasts`.
 *
 * `div[so-toasts]` стоит первым: по первому селектору Angular выбирает тег
 * хоста, когда создаёт компонент сам (`createComponent`). На `<ng-container>`
 * менеджер не ставится: у контейнера нет узла, и написанное на нём региону не
 * дошло бы, — база называет это ошибкой.
 *
 * Selector: div[so-toasts], [so-toasts]
 */
@Component({
	selector: 'div[so-toasts], [so-toasts]',
	standalone: true,
	imports: [NgTemplateOutlet, SlotDirective, TToastsItemComponent],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './toasts.component.html',
})
export class TToastsComponent extends TToastsSurface<IToasts> {
	constructor() {
		super(ToastsInputNames, { strategy: 'wrapped', teleport: { target: 'target' } })
	}

	protected createBinding(
		ctrl: IToasts | undefined,
		inputs: object,
	): TBinding<IToasts, TToastsCollectionFacade> {
		return setupToasts(ctrl, inputs, this.engine)
	}
}
