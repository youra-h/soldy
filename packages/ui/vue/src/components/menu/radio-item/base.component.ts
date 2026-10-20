import { useEmits, useProps } from '../../../adapter'
import type { TEmits, TProps, UseProps } from '../../../types/common'
import { MenuRadioItemDescriptor, MenuCollectionRadioItemDescriptor } from '@soldy-ui/setup'
import type { IMenuRadioItem } from '@soldy-ui/core'

export const emitsMenuRadioItem: TEmits = [
	...useEmits(MenuRadioItemDescriptor()),
	...useEmits(MenuCollectionRadioItemDescriptor()),
]

export const propsMenuRadioItem: TProps = {
	...(useProps(MenuRadioItemDescriptor()) as TProps),
	...(useProps(MenuCollectionRadioItemDescriptor()) as TProps),
}

export type MenuRadioItemProps = UseProps<typeof MenuRadioItemDescriptor, IMenuRadioItem>

export default {
	name: 'BaseMenuRadioItem',
	emits: emitsMenuRadioItem,
	props: propsMenuRadioItem,
}
