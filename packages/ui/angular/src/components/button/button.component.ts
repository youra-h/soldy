import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgClass, NgTemplateOutlet } from '@angular/common'
import type { IButton } from '@soldy-ui/core'
import type { TBinding } from '../../adapter'
import { AriaDirective } from '../../adapter'
import { ButtonInputNames, ButtonOutputNames, TButtonSurface } from './base.component'
import { setupButton } from './setup.component'

/**
 * TButtonComponent — слой TButton.
 *
 * Входы и выходы объявляет сгенерированная база `TButtonSurface`
 * (generated/button.metadata.ts) вместе с их типами для строгого шаблона,
 * поэтому в `@Component` их нет: вход, объявленный здесь ещё раз, строгая
 * проверка шаблона пропускала бы без сверки значения. Имена конструктор
 * передаёт `TComponentBase` — по ним она читает входы и ставит эмиттеры.
 * Разметка вынесена в button.component.html (templateUrl). Корень (`#root`)
 * живёт внутри `@if`/`@else` и меняет ветку вместе с `tag` — привязку к
 * TElementPlugin по умолчанию берёт на себя TComponentBase.
 *
 * Selector: <soldy-button>
 */
@Component({
	selector: 'soldy-button',
	standalone: true,
	imports: [NgClass, NgTemplateOutlet, AriaDirective],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './button.component.html',
})
export class TButtonComponent extends TButtonSurface<IButton> {
	constructor() {
		super(ButtonInputNames, ButtonOutputNames)
	}

	protected createBinding(ctrl: IButton | undefined, inputs: object): TBinding<IButton> {
		return setupButton(ctrl, inputs)
	}
}
