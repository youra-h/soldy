import { Component, ChangeDetectionStrategy } from '@angular/core'
import type { IComponent } from '@soldy/core'
import type { TBinding } from '../../adapter'
import { TComponentBase } from '../../adapter'
import { ComponentInputNames, ComponentOutputNames } from './base.component'
import { setupComponent } from './setup.component'

/**
 * TComponentComponent — headless-слой TComponent.
 *
 * inputs/outputs — статические константы из generated/component.metadata.ts.
 *
 * Selector: <soldy-component>
 */
@Component({
	selector: 'soldy-component',
	standalone: true,
	inputs: ComponentInputNames as unknown as string[],
	outputs: ComponentOutputNames as unknown as string[],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<ng-content></ng-content>`,
})
export class TComponentComponent extends TComponentBase<IComponent> {
	constructor() {
		super(ComponentInputNames, ComponentOutputNames)
	}

	protected createBinding(
		ctrl: IComponent | undefined,
		inputs: Record<string, any>,
	): TBinding<IComponent> {
		return setupComponent(ctrl, inputs)
	}
}
