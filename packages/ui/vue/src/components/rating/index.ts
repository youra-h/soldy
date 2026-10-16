import type { TClosedComponent } from '../../adapter'
import RatingComponent from './Rating.vue'

export { default as BaseRating, emitsRating, propsRating } from './base.component'

export const Rating: TClosedComponent<typeof RatingComponent> = RatingComponent
