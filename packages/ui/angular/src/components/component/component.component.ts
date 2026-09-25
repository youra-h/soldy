import { Component, ChangeDetectionStrategy } from '@angular/core'
import type { IComponent } from '@soldy-ui/core'
import type { TBinding } from '../../adapter'
import { ComponentInputNames, ComponentOutputNames, TComponentOutputs } from './base.component'
import { setupComponent } from './setup.component'

/**
 * TComponentComponent — headless-слой TComponent.
 *
 * inputs/outputs — статические константы из generated/component.metadata.ts,
 * оттуда же база `TComponentOutputs` — типы выходов для строгого шаблона.
 *
 * Selector: <soldy-component>
 */
@Component({
	selector: 'soldy-component',
	standalone: true,
	inputs: [...ComponentInputNames],
	outputs: [...ComponentOutputNames],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<ng-content></ng-content>`,
})
export class TComponentComponent extends TComponentOutputs<IComponent> {
	constructor() {
		super(ComponentInputNames, ComponentOutputNames)
	}

	protected createBinding(ctrl: IComponent | undefined, inputs: object): TBinding<IComponent> {
		return setupComponent(ctrl, inputs)
	}
}
