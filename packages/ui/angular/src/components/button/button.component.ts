import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgClass, NgTemplateOutlet } from '@angular/common'
import type { IButton } from '@soldy/core'
import type { TBinding } from '../../adapter'
import { AriaDirective, TComponentBase } from '../../adapter'
import { ButtonInputNames, ButtonOutputNames } from './base.component'
import { setupButton } from './setup.component'

/**
 * TButtonComponent — слой TButton.
 *
 * inputs/outputs — статические константы из generated/button.metadata.ts.
 * Разметка вынесена в button.component.html (templateUrl). Корень (`#root`)
 * живёт внутри `@if`/`@else` и меняет ветку вместе с `tag` — привязку к
 * TElementPlugin по умолчанию берёт на себя TComponentBase.
 *
 * Selector: <soldy-button>
 */
@Component({
	selector: 'soldy-button',
	standalone: true,
	inputs: [...ButtonInputNames],
	outputs: [...ButtonOutputNames],
	imports: [NgClass, NgTemplateOutlet, AriaDirective],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './button.component.html',
})
export class TButtonComponent extends TComponentBase<IButton> {
	constructor() {
		super(ButtonInputNames, ButtonOutputNames)
	}

	protected createBinding(
		ctrl: IButton | undefined,
		inputs: object,
	): TBinding<IButton> {
		return setupButton(ctrl, inputs)
	}
}
