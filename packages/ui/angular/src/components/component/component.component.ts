import { Component, ChangeDetectionStrategy } from '@angular/core'
import type { IComponent } from '@soldy-ui/core'
import type { TBinding } from '../../adapter'
import { ComponentInputNames, TComponentSurface } from './base.component'
import { setupComponent } from './setup.component'

/**
 * TComponentComponent — headless-слой TComponent.
 *
 * Входы и выходы с их типами объявляет сгенерированная база
 * `TComponentSurface` (generated/component.metadata.ts), в `@Component` их
 * нет — как у Button.
 *
 * Разметки у TComponent нет ни в одном адаптере, слотов в описании тоже,
 * поэтому шаблон пуст и содержимое, написанное внутри `<so-component>`, не
 * выводится. Селектор — элементный: корня, к которому относились бы атрибуты
 * потребителя, у компонента нет, и `TComponentBase` остаётся со стратегией
 * `'view'` — шаблон без `#root`.
 *
 * Selector: <so-component>
 */
@Component({
	selector: 'so-component',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: '',
})
export class TComponentComponent extends TComponentSurface<IComponent> {
	constructor() {
		super(ComponentInputNames)
	}

	protected createBinding(ctrl: IComponent | undefined, inputs: object): TBinding<IComponent> {
		return setupComponent(ctrl, inputs)
	}
}
