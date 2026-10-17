import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { MenuDescriptor, MenuCollectionDescriptor } from '@soldy-ui/setup'
import type { IMenu } from '@soldy-ui/core'

export const emitsMenu: TEmits = [
	...useEmits(MenuDescriptor()),
	...useEmits(MenuCollectionDescriptor()),
]

export const propsMenu: TProps = {
	...(useProps(MenuDescriptor()) as TProps),
	...(useProps(MenuCollectionDescriptor()) as TProps),
}

export type MenuProps = UseProps<typeof MenuDescriptor, IMenu>

export default {
	name: 'BaseMenu',
	emits: emitsMenu,
	props: propsMenu,
}
