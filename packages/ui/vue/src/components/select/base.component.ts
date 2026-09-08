import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { SelectDescriptor, SelectCollectionDescriptor } from '@soldy/setup'
import type { ISelect } from '@soldy/core'

export const emitsSelect: TEmits = [
	...useEmits(SelectDescriptor()),
	...useEmits(SelectCollectionDescriptor()),
] as unknown as TEmits

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
