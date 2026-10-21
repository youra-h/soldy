import { Directive } from '@angular/core'
import type { IComponent } from '@soldy-ui/core'
import type { TBinding } from '../../adapter'
import { ComponentInputNames, TComponentSurface } from './base.component'
import { setupComponent } from './setup.component'

/**
 * TComponentComponent — headless-слой TComponent.
 *
 * Входы и выходы с их типами объявляет сгенерированная база
 * `TComponentSurface` (generated/component.metadata.ts), в `@Directive` их
 * нет — как у Button.
 *
 * Разметки у TComponent нет ни в одном адаптере, слотов в описании тоже, а
 * корня, к которому относилось бы написанное потребителем, у компонента нет:
 * `TComponentBase` остаётся с корнем по умолчанию — стратегией `'view'` без
 * `#root`. Поэтому компонент — директива, а не компонент Angular, и пишется
 * атрибутом на `<ng-container>`, как провайдер локали:
 * `<ng-container so-component [ctrl]="ctrl" />`. Своего узла и шаблона у
 * директивы нет: на месте контейнера Angular ставит только комментарий-якорь,
 * а написанное внутри контейнера — разметка того, кто его написал, и
 * компонент её не трогает.
 *
 * Selector: [so-component]
 */
@Directive({
	selector: '[so-component]',
	standalone: true,
})
export class TComponentComponent extends TComponentSurface<IComponent> {
	constructor() {
		super(ComponentInputNames)
	}

	protected createBinding(ctrl: IComponent | undefined, inputs: object): TBinding<IComponent> {
		return setupComponent(ctrl, inputs)
	}
}
