import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { SelectDescriptor, SelectCollectionDescriptor } from '@soldy-ui/setup'
import type { ISelect } from '@soldy-ui/core'

export const emitsSelect: TEmits = [
	...useEmits(SelectDescriptor()),
	...useEmits(SelectCollectionDescriptor()),
]

export const propsSelect: TProps = {
	...(useProps(SelectDescriptor()) as TProps),
	...(useProps(SelectCollectionDescriptor()) as TProps),
}

export type SelectProps = UseProps<typeof SelectDescriptor, ISelect>

export default {
	name: 'BaseSelect',
	emits: emitsSelect,
	props: propsSelect,
}
