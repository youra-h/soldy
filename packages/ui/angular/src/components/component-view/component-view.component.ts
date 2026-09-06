import {
	Component,
	ChangeDetectionStrategy,
	ElementRef,
	AfterViewInit,
	HostBinding,
	inject,
} from '@angular/core'
import type { IComponentView } from '@soldy/core'
import type { TBinding } from '../../adapter'
import { TComponentBase } from '../../adapter'
import { ComponentViewInputNames, ComponentViewOutputNames } from './base.component'
import { setupComponentView } from './setup.component'

/**
 * TComponentViewComponent — слой TComponentView с DOM-биндингом.
 *
 * inputs/outputs — статические константы из generated/component-view.metadata.ts.
 * Классы и видимость применяются к хост-элементу через @HostBinding.
 *
 * Хост существует всё время жизни компонента, поэтому DOM-биндинг разовый —
 * в отличие от Button, где корень живёт внутри @if и пересоздаётся.
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
	extends TComponentBase<IComponentView>
	implements AfterViewInit
{
	@HostBinding('class') get hostClass(): string {
		return (this.state()['classes'] as string[] | undefined)?.join(' ') ?? ''
	}

	@HostBinding('style.display') get hostDisplay(): string | null {
		const state = this.state()

		return state['rendered'] === false || state['visible'] === false ? 'none' : null
	}

	private readonly _elementRef = inject(ElementRef)

	constructor() {
		super(ComponentViewInputNames, ComponentViewOutputNames)
	}

	protected createBinding(
		ctrl: IComponentView | undefined,
		inputs: Record<string, any>,
	): TBinding<IComponentView> {
		return setupComponentView(ctrl, inputs)
	}

	ngAfterViewInit(): void {
		this.bindElement(this._elementRef.nativeElement)
	}
}
