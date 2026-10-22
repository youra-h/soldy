import { Component, ChangeDetectionStrategy } from '@angular/core'
import type { IProgressLinear } from '@soldy-ui/core'
import { TProgressLinearSurface } from '../../generated/progress-linear.metadata'
import { setupProgressLinear } from './setup.component'

/**
 * Индикатор выполнения линией: корень — дорожка, шаблон — заливка доли.
 * AGENTS.md (Angular), «Стиль корня-хоста — тоже эффект базы, по свойствам».
 */
@Component({
	selector: 'span[so-progress-linear], [so-progress-linear]',
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './progress-linear.component.html',
})
export class TProgressLinearComponent extends TProgressLinearSurface<IProgressLinear> {
	constructor() {
		super(setupProgressLinear, { strategy: 'host', style: 'percentStyle' })
	}
}
