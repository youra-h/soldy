import {
	Component,
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	ElementRef,
	EventEmitter,
	Input,
	OnInit,
	OnChanges,
	AfterViewInit,
	OnDestroy,
	SimpleChanges,
	ViewChild,
	inject,
} from '@angular/core'
import { NgClass } from '@angular/common'
import type { IButton } from '@soldy/core'
import type { TAngularBinding } from '../../adapter'
import { ButtonInputNames, ButtonOutputNames } from './base.component'
import { setupButton } from './setup.component'

/**
 * ButtonComponent — слой TButton.
 *
 * inputs/outputs генерируются из ButtonDescriptor.
 * EventEmitter'ы создаются динамически в конструкторе.
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
	template: `
		@if (state['rendered']) {
			@if (isNativeButton) {
				<button
					#buttonEl
					[ngClass]="state['classes']"
					[style.display]="state['visible'] === false ? 'none' : null"
					[disabled]="state['disabled']"
				>
					<span class="s-button__text">
						<ng-content>{{ state['text'] }}</ng-content>
					</span>
				</button>
			} @else {
				<div
					#buttonEl
					[ngClass]="state['classes']"
					[style.display]="state['visible'] === false ? 'none' : null"
					[attr.aria-disabled]="state['disabled'] || null"
				>
					<span class="s-button__text">
						<ng-content>{{ state['text'] }}</ng-content>
					</span>
				</div>
			}
		}
	`,
})
export class ButtonComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
	@Input() ctrl?: IButton

	@ViewChild('buttonEl', { read: ElementRef }) buttonElRef?: ElementRef

	private _binding?: TAngularBinding<IButton>
	private _eventsCleanup?: () => void
	private readonly _cdr = inject(ChangeDetectorRef)

	constructor() {
		for (const name of ButtonOutputNames) {
			;(this as any)[name] = new EventEmitter()
		}
	}

	get state(): Record<string, any> {
		return this._binding?.state ?? {}
	}

	get isNativeButton(): boolean {
		return this.state['tag'] === 'button'
	}

	ngOnInit(): void {
		this._binding = setupButton(
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
		this._binding?.bindElement(this.buttonElRef?.nativeElement ?? null)
	}

	ngOnDestroy(): void {
		this._eventsCleanup?.()
		this._binding?.destroy()
	}

	private _collectInputs(): Record<string, any> {
		const inputs: Record<string, any> = {}

		for (const name of ButtonInputNames) {
			const value = (this as any)[name]
			if (value !== undefined) inputs[name] = value
		}

		return inputs
	}

	private _collectOutputs(): Record<string, EventEmitter<any>> {
		const outputs: Record<string, EventEmitter<any>> = {}

		for (const name of ButtonOutputNames) {
			outputs[name] = (this as any)[name]
		}

		return outputs
	}
}
