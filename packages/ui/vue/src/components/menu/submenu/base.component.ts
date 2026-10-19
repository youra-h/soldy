import { useEmits, useProps } from '../../../adapter'
import type { TEmits, TProps, UseProps } from '../../../types/common'
import {
	MenuCollectionItemDescriptor,
	MenuSubmenuCollectionDescriptor,
	MenuSubmenuDescriptor,
} from '@soldy-ui/setup'
import type { IMenuSubmenu } from '@soldy-ui/core'

export const emitsMenuSubmenu: TEmits = [
	...useEmits(MenuSubmenuDescriptor()),
	...useEmits(MenuCollectionItemDescriptor()),
	...useEmits(MenuSubmenuCollectionDescriptor()),
]

export const propsMenuSubmenu: TProps = {
	...(useProps(MenuSubmenuDescriptor()) as TProps),
	...(useProps(MenuCollectionItemDescriptor()) as TProps),
	...(useProps(MenuSubmenuCollectionDescriptor()) as TProps),
}

export type MenuSubmenuProps = UseProps<typeof MenuSubmenuDescriptor, IMenuSubmenu>

export default {
	name: 'BaseMenuSubmenu',
	emits: emitsMenuSubmenu,
	props: propsMenuSubmenu,
}
