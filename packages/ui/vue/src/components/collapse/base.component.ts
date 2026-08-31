import { BaseControl } from '../control'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps } from '../../types/common'
import { CollapseDescriptor, CollapseCollectionDescriptor } from '@soldy/setup'

export const emitsCollapse: TEmits = [
	...useEmits(CollapseDescriptor()),
	...useEmits(CollapseCollectionDescriptor()),
] as unknown as TEmits

export const propsCollapse: TProps = {
	...(useProps(CollapseDescriptor()) as TProps),
	...(useProps(CollapseCollectionDescriptor()) as TProps),
}

export default {
	name: 'BaseCollapse',
	extends: BaseControl,
	emits: emitsCollapse,
	props: propsCollapse,
}
