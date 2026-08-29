import { BaseControl } from '../control'
import { useEmits, useProps, useCollectionProps, useCollectionEmits } from '../../adapter'
import type { TEmits, TProps } from '../../types/common'
import { TabsDescriptor, TabsCollectionDescriptor } from '@soldy/setup'

export const emitsTabs: TEmits = [
	...useEmits(TabsDescriptor()),
	...useCollectionEmits(TabsCollectionDescriptor()),
] as unknown as TEmits

export const propsTabs: TProps = {
	...(useProps(TabsDescriptor()) as TProps),
	...(useCollectionProps(TabsCollectionDescriptor()) as TProps),
}

export default {
	name: 'BaseTabs',
	extends: BaseControl,
	emits: emitsTabs,
	props: propsTabs,
}
