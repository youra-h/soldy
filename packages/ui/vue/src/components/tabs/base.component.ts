import { BaseControl } from '../control'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { TabsDescriptor, TabsCollectionDescriptor } from '@soldy/setup'
import type { ITabs } from '@soldy/core'

export const emitsTabs: TEmits = [
	...useEmits(TabsDescriptor()),
	...useEmits(TabsCollectionDescriptor()),
] as unknown as TEmits

export const propsTabs: TProps = {
	...(useProps(TabsDescriptor()) as TProps),
	...(useProps(TabsCollectionDescriptor()) as TProps),
}

export type TabsProps = UseProps<typeof TabsDescriptor, ITabs>

export default {
	name: 'BaseTabs',
	emits: emitsTabs,
	props: propsTabs,
}
