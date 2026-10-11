import { Component, ChangeDetectionStrategy } from '@angular/core'
import type { IProgressSpinner } from '@soldy-ui/core'
import type { TBinding } from '../../adapter'
import { ProgressSpinnerInputNames, TProgressSpinnerSurface } from './base.component'
import { setupProgressSpinner } from './setup.component'

/**
 * TProgressSpinnerComponent — индикатор выполнения кольцом.
 *
 * Обёртки нет: корень — сам элемент потребителя (`<span so-progress-spinner>`),
 * шаблон — рисунок кольца внутри него. Корень по умолчанию — `span`: кольцо
 * кладут в Button и Label, а внутри них HTML разрешает только строчную
 * разметку.
 *
 * Размер и вариант (`--size-*`, `--variant-*`), бег (`data-indeterminate`),
 * роль, значения и имя для скринридера и `dir` раскладывает на элемент
 * `TComponentBase` (стратегия `'host'`). Долю готового — переменную
 * `--s-progress-spinner-fraction` выхода `fractionStyle` — тоже она: это
 * стиль-выход компонента, и его имя компонент называет базе. Стиль
 * потребителя главнее доли.
 *
 * `span[so-progress-spinner]` стоит первым: по первому селектору Angular
 * выбирает тег хоста, когда создаёт компонент сам (`createComponent`), — это
 * тег ядра по умолчанию.
 *
 * Selector: span[so-progress-spinner], [so-progress-spinner]
 */
@Component({
	selector: 'span[so-progress-spinner], [so-progress-spinner]',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './progress-spinner.component.html',
})
export class TProgressSpinnerComponent extends TProgressSpinnerSurface<IProgressSpinner> {
	constructor() {
		super(ProgressSpinnerInputNames, { strategy: 'host', style: 'fractionStyle' })
	}

	protected createBinding(
		ctrl: IProgressSpinner | undefined,
		inputs: object,
	): TBinding<IProgressSpinner> {
		return setupProgressSpinner(ctrl, inputs)
	}
}
