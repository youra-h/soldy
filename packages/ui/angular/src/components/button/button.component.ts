import {
	Component,
	ChangeDetectionStrategy,
	ElementRef,
	computed,
	viewChild,
} from '@angular/core'
import { NgClass, NgTemplateOutlet } from '@angular/common'
import type { IButton } from '@soldy/core'
import type { TBinding } from '../../adapter'
import { TComponentBase } from '../../adapter'
import { ButtonInputNames, ButtonOutputNames } from './base.component'
import { setupButton } from './setup.component'

/**
 * TButtonComponent — слой TButton.
 *
 * inputs/outputs — статические константы из generated/button.metadata.ts.
 * Разметка вынесена в button.component.html (templateUrl).
 *
 * Selector: <soldy-button>
 */
@Component({
	selector: 'soldy-button',
	standalone: true,
	inputs: ButtonInputNames as unknown as string[],
	outputs: ButtonOutputNames as unknown as string[],
	imports: [NgClass, NgTemplateOutlet],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './button.component.html',
})
export class TButtonComponent extends TComponentBase<IButton> {
	/**
	 * Сигнальный запрос, а не @ViewChild: корень живёт внутри @if и меняет
	 * ветку вместе с `tag`, поэтому ссылка обязана переустанавливаться.
	 */
	private readonly _buttonEl = viewChild('buttonEl', { read: ElementRef })

	readonly isNativeButton = computed(() => this.state()['tag'] === 'button')

	constructor() {
		super(ButtonInputNames, ButtonOutputNames)

		this.bindElementFrom(this._buttonEl)
	}

	protected createBinding(
		ctrl: IButton | undefined,
		inputs: Record<string, any>,
	): TBinding<IButton> {
		return setupButton(ctrl, inputs)
	}
}
