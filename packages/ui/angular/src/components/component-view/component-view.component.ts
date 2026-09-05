import {
	Component,
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	ElementRef,
	EventEmitter,
	HostBinding,
	Input,
	OnInit,
	OnChanges,
	AfterViewInit,
	OnDestroy,
	SimpleChanges,
	inject,
} from '@angular/core'
import type { IComponentView } from '@soldy/core'
import type { TAngularBinding } from '../../adapter'
import { ComponentViewInputNames, ComponentViewOutputNames } from './base.component'
import { setupComponentView } from './setup.component'

/**
 * ComponentViewComponent — слой TComponentView с DOM-биндингом.
 *
 * inputs/outputs генерируются из дескриптора. Классы и видимость применяются
 * к хост-элементу через @HostBinding.
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
export class ComponentViewComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
	@Input() ctrl?: IComponentView

	// ─── Host bindings ────────────────────────────────────────────────────────
	@HostBinding('class') get hostClass(): string {
		return (this.state['classes'] as string[] | undefined)?.join(' ') ?? ''
	}

	@HostBinding('style.display') get hostDisplay(): string | null {
		return this.state['rendered'] === false || this.state['visible'] === false ? 'none' : null
	}

	// ─── Internal ─────────────────────────────────────────────────────────────
	private _binding?: TAngularBinding<IComponentView>
	private _eventsCleanup?: () => void
	private readonly _cdr = inject(ChangeDetectorRef)
	private readonly _elementRef = inject(ElementRef)

	constructor() {
		for (const name of ComponentViewOutputNames) {
			;(this as any)[name] = new EventEmitter()
		}
	}

	get state(): Record<string, any> {
		return this._binding?.state ?? {}
	}

	ngOnInit(): void {
		this._binding = setupComponentView(
			this.ctrl,
			this._collectInputs(),
			this._cdr,
		)
		this._eventsCleanup = this._binding.syncEvents(this._collectOutputs())
	}

	ngOnChanges(changes: SimpleChanges): void {
		if (!this._binding) return

		const inputs: Record<string, any> = {}

		for (const key of Object.keys(changes)) {
			inputs[key] = changes[key].currentValue
		}

		this._binding.syncInputs(inputs)
	}

	ngAfterViewInit(): void {
		this._binding?.bindElement(this._elementRef.nativeElement)
	}

	ngOnDestroy(): void {
		this._eventsCleanup?.()
		this._binding?.destroy()
	}

	private _collectInputs(): Record<string, any> {
		const inputs: Record<string, any> = {}

		for (const name of ComponentViewInputNames) {
			const value = (this as any)[name]
			if (value !== undefined) inputs[name] = value
		}

		return inputs
	}

	private _collectOutputs(): Record<string, EventEmitter<any>> {
		const outputs: Record<string, EventEmitter<any>> = {}

		for (const name of ComponentViewOutputNames) {
			outputs[name] = (this as any)[name]
		}

		return outputs
	}
}
