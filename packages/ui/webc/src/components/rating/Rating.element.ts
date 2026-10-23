/**
 * `<span is="so-rating">` — оценка звёздами на нативном `input[type="range"]`.
 * Атрибуты потребителя — на корне: указатель поле не ловит. `fieldId`: без него
 * `id` встал бы и на корень, и `<label for>` нашёл бы корень.
 */

import { RatingDescriptor } from '@soldy-ui/setup'
import type { IRating } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { TElementClassOf, TElementType } from '../../adapter'
import { ratingTemplate } from './rating.template'
import { setupRating } from './setup.component'

export const TRatingElement: TElementClassOf<
	typeof HTMLSpanElement,
	typeof RatingDescriptor,
	IRating
> = ElementBase(HTMLSpanElement, {
	descriptor: RatingDescriptor,
	template: ratingTemplate,
	root: { strategy: 'host', sets: ['attrs', 'dataset'], fieldId: true },
	setup: setupRating,
})

defineElement('so-rating', TRatingElement, 'span')

export type TRatingElementProps = TElementType<typeof TRatingElement>
