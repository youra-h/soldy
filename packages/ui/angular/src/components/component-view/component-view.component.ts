import {
	Component,
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	ElementRef,
	AfterViewInit,
	HostBinding,
	inject,
} from '@angular/core'
import type { IComponentView } from '@soldy/core'
import type { TAngularBinding } from '../../adapter'
import { TAngularComponentBase } from '../../adapter'
import { ComponentViewInputNames, ComponentViewOutputNames } from './base.component'
import { setupComponentView } from './setup.component'

/**
 * TComponentViewComponent — слой TComponentView с DOM-биндингом.
 *
 * inputs/outputs — статические константы из generated/component-view.metadata.ts.
 * Классы и видимость применяются к хост-элементу через @HostBinding.
 *
 * Selector: <soldy-component-view>
 */
@Component({
	selector: 'soldy-component-view',
	standalone: true,
	inputs: ComponentViewInputNames as unknown as string[],
	outputs: ComponentViewOutputNames as unknown as string[],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<ng-content></ng-content>`,
})
export class TComponentViewComponent
	extends TAngularComponentBase<IComponentView>
	implements AfterViewInit
{
	// ─── Host bindings ────────────────────────────────────────────────────────
	@HostBinding('class') get hostClass(): string {
		return (this.state['classes'] as string[] | undefined)?.join(' ') ?? ''
	}

	@HostBinding('style.display') get hostDisplay(): string | null {
		return this.state['rendered'] === false || this.state['visible'] === false ? 'none' : null
	}

	private readonly _elementRef = inject(ElementRef)

	constructor() {
		super(ComponentViewInputNames, ComponentViewOutputNames)
	}

	protected createBinding(
		ctrl: IComponentView | undefined,
		inputs: Record<string, any>,
		cdr: ChangeDetectorRef,
	): TAngularBinding<IComponentView> {
		return setupComponentView(ctrl, inputs, cdr)
	}

	ngAfterViewInit(): void {
		this.bindElement(this._elementRef.nativeElement)
	}
}
