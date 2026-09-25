import { Component, ChangeDetectionStrategy } from '@angular/core'
import type { IComponent } from '@soldy-ui/core'
import type { TBinding } from '../../adapter'
import { ComponentInputNames, ComponentOutputNames, TComponentSurface } from './base.component'
import { setupComponent } from './setup.component'

/**
 * TComponentComponent — headless-слой TComponent.
 *
 * Входы и выходы с их типами объявляет сгенерированная база
 * `TComponentSurface` (generated/component.metadata.ts), в `@Component` их
 * нет — как у Button.
 *
 * Selector: <soldy-component>
 */
@Component({
	selector: 'soldy-component',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<ng-content></ng-content>`,
})
export class TComponentComponent extends TComponentSurface<IComponent> {
	constructor() {
		super(ComponentInputNames, ComponentOutputNames)
	}

	protected createBinding(ctrl: IComponent | undefined, inputs: object): TBinding<IComponent> {
		return setupComponent(ctrl, inputs)
	}
}
