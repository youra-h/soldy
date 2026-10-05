import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { TableDescriptor, TableCollectionDescriptor } from '@soldy-ui/setup'
import type { ITable } from '@soldy-ui/core'

export const emitsTable: TEmits = [
	...useEmits(TableDescriptor()),
	...useEmits(TableCollectionDescriptor()),
]

export const propsTable: TProps = {
	...(useProps(TableDescriptor()) as TProps),
	...(useProps(TableCollectionDescriptor()) as TProps),
}

export type TableProps = UseProps<typeof TableDescriptor, ITable>

export default {
	name: 'BaseTable',
	emits: emitsTable,
	props: propsTable,
}
