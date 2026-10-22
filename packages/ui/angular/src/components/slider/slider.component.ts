import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { ISlider } from '@soldy-ui/core'
import { AttributesDirective, FieldTextDirective, TextPipe, provideElevator } from '../../adapter'
import { TSliderSurface } from '../../generated/slider.metadata'
import { setupSlider } from './setup.component'

/**
 * Ползунок: ручки на рельсе, заливка и метки. Корень — `span`: ползунок кладут в `label`.
 * Атрибуты потребителя остаются на корне: полей столько, сколько ручек.
 */
@Component({
	selector: 'span[so-slider], [so-slider]',
	imports: [NgTemplateOutlet, AttributesDirective, FieldTextDirective, TextPipe],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './slider.component.html',
})
export class TSliderComponent extends TSliderSurface<ISlider> {
	constructor() {
		super(setupSlider, { strategy: 'host', aria: 'rootAria' })
	}
}
