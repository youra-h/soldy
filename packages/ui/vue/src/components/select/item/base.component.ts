import { useEmits, useProps } from '../../../adapter'
import type { TEmits, TProps, UseProps } from '../../../types/common'
import { SelectItemDescriptor, SelectCollectionItemDescriptor } from '@soldy/setup'
import type { ISelectItem } from '@soldy/core'

export const emitsSelectItem: TEmits = [
	...useEmits(SelectItemDescriptor()),
	...useEmits(SelectCollectionItemDescriptor()),
] as unknown as TEmits

export const propsSelectItem: TProps = {
	...(useProps(SelectItemDescriptor()) as TProps),
	...(useProps(SelectCollectionItemDescriptor()) as TProps),
}

export type SelectItemProps = UseProps<typeof SelectItemDescriptor, ISelectItem>

export default {
	name: 'BaseSelectItem',
	emits: emitsSelectItem,
	props: propsSelectItem,
}
