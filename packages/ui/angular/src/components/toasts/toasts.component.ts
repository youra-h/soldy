import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IToasts } from '@soldy-ui/core'
import { SlotDirective, provideElevator } from '../../adapter'
import { TToastsItemComponent } from './item'
import { TToastsSurface } from '../../generated/toasts.metadata'
import { setupToasts } from './setup.component'

/**
 * Менеджер тостов вокруг приложения: хост — обёртка без коробки, корень — регион в слое.
 * AGENTS.md (Angular), «Корень внутри обёртки в слое — регион тостов».
 */
@Component({
	selector: 'div[so-toasts], [so-toasts]',
	imports: [NgTemplateOutlet, SlotDirective, TToastsItemComponent],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './toasts.component.html',
})
export class TToastsComponent extends TToastsSurface<IToasts> {
	constructor() {
		super((ctrl, inputs) => setupToasts(ctrl, inputs, this.engine), {
			strategy: 'wrapped',
			teleport: { target: 'target' },
		})
	}
}
