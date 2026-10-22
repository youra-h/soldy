import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { IRating } from '@soldy-ui/core'
import {
	AttributesDirective,
	FieldTextDirective,
	RoleIconDirective,
	TextPipe,
	provideElevator,
} from '../../adapter'
import { TRatingSurface } from '../../generated/rating.metadata'
import { setupRating } from './setup.component'

/**
 * Оценка звёздами — ползунок с одной ручкой. Корень — `span`: оценку кладут в `label`.
 * Атрибуты потребителя остаются на корне: указатель поле не ловит.
 */
@Component({
	selector: 'span[so-rating], [so-rating]',
	imports: [
		NgTemplateOutlet,
		AttributesDirective,
		FieldTextDirective,
		RoleIconDirective,
		TextPipe,
	],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './rating.component.html',
})
export class TRatingComponent extends TRatingSurface<IRating> {
	constructor() {
		super(setupRating, { strategy: 'host', sets: ['attrs', 'dataset'] })
	}
}
