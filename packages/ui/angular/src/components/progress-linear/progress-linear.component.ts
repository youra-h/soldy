import { Component, ChangeDetectionStrategy } from '@angular/core'
import type { IProgressLinear } from '@soldy-ui/core'
import { TProgressLinearSurface } from '../../generated/progress-linear.metadata'
import { setupProgressLinear } from './setup.component'

/**
 * TProgressLinearComponent — индикатор выполнения линией.
 *
 * Обёртки нет: корень — сам элемент потребителя (`<span so-progress-linear>`),
 * он же дорожка во всю длину, а шаблон — заливка доли внутри него. Корень по
 * умолчанию — `span`: полосу кладут в Button и Label, а внутри них HTML
 * разрешает только строчную разметку.
 *
 * Размер, вариант и ось (`--size-*`, `--variant-*`, `--horizontal` или
 * `--vertical`), бег (`data-indeterminate`), роль, значения и имя для
 * скринридера и `dir` раскладывает на элемент `TComponentBase` (стратегия
 * `'host'`). Долю готового — переменную `--so-progress-linear-percent` выхода
 * `percentStyle` — тоже она: это стиль-выход компонента, и его имя компонент
 * называет базе, как ProgressSpinner — `fractionStyle`. Стиль потребителя
 * главнее доли.
 *
 * `span[so-progress-linear]` стоит первым: по первому селектору Angular
 * выбирает тег хоста, когда создаёт компонент сам (`createComponent`), — это
 * тег ядра по умолчанию.
 *
 * Selector: span[so-progress-linear], [so-progress-linear]
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
