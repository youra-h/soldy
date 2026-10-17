import { useEmits, useProps } from '../../../adapter'
import type { TEmits, TProps, UseProps } from '../../../types/common'
import { MenuItemDescriptor, MenuCollectionItemDescriptor } from '@soldy-ui/setup'
import type { IMenuItem } from '@soldy-ui/core'

export const emitsMenuItem: TEmits = [
	...useEmits(MenuItemDescriptor()),
	...useEmits(MenuCollectionItemDescriptor()),
]

export const propsMenuItem: TProps = {
	...(useProps(MenuItemDescriptor()) as TProps),
	...(useProps(MenuCollectionItemDescriptor()) as TProps),
}

export type MenuItemProps = UseProps<typeof MenuItemDescriptor, IMenuItem>

export default {
	name: 'BaseMenuItem',
	emits: emitsMenuItem,
	props: propsMenuItem,
}
