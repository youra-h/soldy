import { useEmits, useProps } from '../../../adapter'
import type { TEmits, TProps, UseProps } from '../../../types/common'
import { MenuCollectionItemDescriptor, MenuPopoverItemDescriptor } from '@soldy-ui/setup'
import type { IMenuPopoverItem } from '@soldy-ui/core'

export const emitsMenuPopoverItem: TEmits = [
	...useEmits(MenuPopoverItemDescriptor()),
	...useEmits(MenuCollectionItemDescriptor()),
]

export const propsMenuPopoverItem: TProps = {
	...(useProps(MenuPopoverItemDescriptor()) as TProps),
	...(useProps(MenuCollectionItemDescriptor()) as TProps),
}

export type MenuPopoverItemProps = UseProps<typeof MenuPopoverItemDescriptor, IMenuPopoverItem>

export default {
	name: 'BaseMenuPopoverItem',
	emits: emitsMenuPopoverItem,
	props: propsMenuPopoverItem,
}
