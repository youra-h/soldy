import {
	Component,
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	ElementRef,
	AfterViewInit,
	ViewChild,
} from '@angular/core'
import { NgClass } from '@angular/common'
import type { IButton } from '@soldy/core'
import type { TAngularBinding } from '../../adapter'
import { TAngularComponentBase } from '../../adapter'
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
	imports: [NgClass],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './button.component.html',
})
export class TButtonComponent extends TAngularComponentBase<IButton> implements AfterViewInit {
	@ViewChild('buttonEl', { read: ElementRef }) buttonElRef?: ElementRef

	constructor() {
		super(ButtonInputNames, ButtonOutputNames)
	}

	protected createBinding(
		ctrl: IButton | undefined,
		inputs: Record<string, any>,
		cdr: ChangeDetectorRef,
	): TAngularBinding<IButton> {
		return setupButton(ctrl, inputs, cdr)
	}

	get isNativeButton(): boolean {
		return this.state['tag'] === 'button'
	}

	ngAfterViewInit(): void {
		this.bindElement(this.buttonElRef?.nativeElement ?? null)
	}
}
