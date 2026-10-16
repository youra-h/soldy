import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { PaginationDescriptor, PaginationCollectionDescriptor } from '@soldy-ui/setup'
import type { IPagination } from '@soldy-ui/core'

export const emitsPagination: TEmits = [
	...useEmits(PaginationDescriptor()),
	...useEmits(PaginationCollectionDescriptor()),
]

export const propsPagination: TProps = {
	...(useProps(PaginationDescriptor()) as TProps),
	...(useProps(PaginationCollectionDescriptor()) as TProps),
}

export type PaginationProps = UseProps<typeof PaginationDescriptor, IPagination>

export default {
	name: 'BasePagination',
	emits: emitsPagination,
	props: propsPagination,
}
