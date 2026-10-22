import { Component, ChangeDetectionStrategy } from '@angular/core'
import type { ILabel } from '@soldy-ui/core'
import { TLabelSurface } from '../../generated/label.metadata'
import { setupLabel } from './setup.component'

/**
 * Подпись контрола: корень — `<label so-label>`, контрол — его первый labelable-потомок,
 * поэтому связки через `for` и `id` нет.
 */
@Component({
	selector: 'label[so-label], [so-label]',
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './label.component.html',
})
export class TLabelComponent extends TLabelSurface<ILabel> {
	constructor() {
		super(setupLabel, { strategy: 'host' })
	}
}
