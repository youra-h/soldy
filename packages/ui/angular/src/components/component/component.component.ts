import {
	Component,
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	EventEmitter,
	OnInit,
	OnChanges,
	OnDestroy,
	SimpleChanges,
	inject,
} from '@angular/core'
import type { IComponent } from '@soldy/core'
import type { TAngularBinding } from '../../adapter'
import { ComponentInputNames, ComponentOutputNames } from './base.component'
import { setupComponent } from './setup.component'

/**
 * ComponentComponent — headless-слой TComponent.
 *
 * inputs/outputs генерируются из ComponentDescriptor через useInputs / useOutputs.
 * EventEmitter'ы создаются динамически в конструкторе — Angular находит их по именам
 * из массива outputs в @Component.
 *
 * Selector: <soldy-component>
 */
@Component({
	selector: 'soldy-component',
	standalone: true,
	inputs: ComponentInputNames as unknown as string[],
	outputs: ComponentOutputNames as unknown as string[],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<ng-content></ng-content>`,
})
export class ComponentComponent implements OnInit, OnChanges, OnDestroy {
	private _binding?: TAngularBinding<IComponent>
	private _eventsCleanup?: () => void
	private readonly _cdr = inject(ChangeDetectorRef)

	constructor() {
		for (const name of ComponentOutputNames) {
			;(this as any)[name] = new EventEmitter()
		}
	}

	get state(): Record<string, any> {
		return this._binding?.state ?? {}
	}

	ngOnInit(): void {
		this._binding = setupComponent(
			(this as any).ctrl,
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

	ngOnDestroy(): void {
		this._eventsCleanup?.()
		this._binding?.destroy()
	}

	private _collectInputs(): Record<string, any> {
		const inputs: Record<string, any> = {}

		for (const name of ComponentInputNames) {
			const value = (this as any)[name]
			if (value !== undefined) inputs[name] = value
		}

		return inputs
	}

	private _collectOutputs(): Record<string, EventEmitter<any>> {
		const outputs: Record<string, EventEmitter<any>> = {}

		for (const name of ComponentOutputNames) {
			outputs[name] = (this as any)[name]
		}

		return outputs
	}
}
