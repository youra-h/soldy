import { useEmits, useProps } from '../../../adapter'
import type { TEmits, TProps, UseProps } from '../../../types/common'
import { TableColumnDescriptor } from '@soldy-ui/setup'
import type { ITableColumn } from '@soldy-ui/core'

export const emitsTableColumn: TEmits = useEmits(TableColumnDescriptor())

export const propsTableColumn: TProps = useProps(TableColumnDescriptor()) as TProps

export type TableColumnProps = UseProps<typeof TableColumnDescriptor, ITableColumn>

export default {
	name: 'BaseTableColumn',
	emits: emitsTableColumn,
	props: propsTableColumn,
}
