import { Component, ChangeDetectionStrategy } from '@angular/core'
import type { IProgressSpinner } from '@soldy-ui/core'
import { TProgressSpinnerSurface } from '../../generated/progress-spinner.metadata'
import { setupProgressSpinner } from './setup.component'

/**
 * Индикатор выполнения кольцом: шаблон — рисунок кольца, долю кладёт стиль-выход.
 * AGENTS.md (Angular), «Стиль корня-хоста — тоже эффект базы, по свойствам».
 */
@Component({
	selector: 'span[so-progress-spinner], [so-progress-spinner]',
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './progress-spinner.component.html',
})
export class TProgressSpinnerComponent extends TProgressSpinnerSurface<IProgressSpinner> {
	constructor() {
		super(setupProgressSpinner, { strategy: 'host', style: 'fractionStyle' })
	}
}
