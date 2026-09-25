import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgClass, NgTemplateOutlet } from '@angular/common'
import type { IButton } from '@soldy-ui/core'
import type { TBinding } from '../../adapter'
import { AriaDirective } from '../../adapter'
import { ButtonInputNames, ButtonOutputNames, TButtonOutputs } from './base.component'
import { setupButton } from './setup.component'

/**
 * TButtonComponent — слой TButton.
 *
 * inputs/outputs — статические константы из generated/button.metadata.ts,
 * оттуда же база `TButtonOutputs` — типы выходов для строгого шаблона.
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
export class TButtonComponent extends TButtonOutputs<IButton> {
	constructor() {
		super(ButtonInputNames, ButtonOutputNames)
	}

	protected createBinding(ctrl: IButton | undefined, inputs: object): TBinding<IButton> {
		return setupButton(ctrl, inputs)
	}
}
