import { BaseControl } from '../control'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { CollapseDescriptor, CollapseCollectionDescriptor } from '@soldy/setup'
import type { ICollapse } from '@soldy/core'

export const emitsCollapse: TEmits = [
	...useEmits(CollapseDescriptor()),
	...useEmits(CollapseCollectionDescriptor()),
] as unknown as TEmits

export const propsCollapse: TProps = {
	...(useProps(CollapseDescriptor()) as TProps),
	...(useProps(CollapseCollectionDescriptor()) as TProps),
}

export type CollapseProps = UseProps<typeof CollapseDescriptor, ICollapse>

export default {
	name: 'BaseCollapse',
	emits: emitsCollapse,
	props: propsCollapse,
}
