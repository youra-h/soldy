import { useEmits, useProps } from '../../../adapter'
import type { TEmits, TProps, UseProps } from '../../../types/common'
import { TableRowDescriptor, TableCollectionRowDescriptor } from '@soldy-ui/setup'
import type { ITableRow } from '@soldy-ui/core'

export const emitsTableRow: TEmits = [
	...useEmits(TableRowDescriptor()),
	...useEmits(TableCollectionRowDescriptor()),
]

export const propsTableRow: TProps = {
	...(useProps(TableRowDescriptor()) as TProps),
	...(useProps(TableCollectionRowDescriptor()) as TProps),
}

export type TableRowProps = UseProps<typeof TableRowDescriptor, ITableRow>

export default {
	name: 'BaseTableRow',
	emits: emitsTableRow,
	props: propsTableRow,
}
