import { useEmits, useProps } from '../../../adapter'
import type { TEmits, TProps, UseProps } from '../../../types/common'
import { PaginationItemDescriptor, PaginationCollectionItemDescriptor } from '@soldy-ui/setup'
import type { IPaginationItem } from '@soldy-ui/core'

export const emitsPaginationItem: TEmits = [
	...useEmits(PaginationItemDescriptor()),
	...useEmits(PaginationCollectionItemDescriptor()),
]

export const propsPaginationItem: TProps = {
	...(useProps(PaginationItemDescriptor()) as TProps),
	...(useProps(PaginationCollectionItemDescriptor()) as TProps),
}

export type PaginationItemProps = UseProps<typeof PaginationItemDescriptor, IPaginationItem>

export default {
	name: 'BasePaginationItem',
	emits: emitsPaginationItem,
	props: propsPaginationItem,
}
