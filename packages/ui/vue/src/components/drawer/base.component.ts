import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { DrawerDescriptor } from '@soldy-ui/setup'
import type { IDrawer } from '@soldy-ui/core'

export const emitsDrawer: TEmits = useEmits(DrawerDescriptor())

export const propsDrawer: TProps = useProps(DrawerDescriptor()) as TProps

export type DrawerProps = UseProps<typeof DrawerDescriptor, IDrawer>

export default {
	name: 'BaseDrawer',
	emits: emitsDrawer,
	props: propsDrawer,
}
