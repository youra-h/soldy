import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { RatingDescriptor } from '@soldy-ui/setup'
import type { IRating } from '@soldy-ui/core'

export const emitsRating: TEmits = useEmits(RatingDescriptor())

export const propsRating: TProps = useProps(RatingDescriptor()) as TProps

export type RatingProps = UseProps<typeof RatingDescriptor, IRating>

export default {
	name: 'BaseRating',
	emits: emitsRating,
	props: propsRating,
}
