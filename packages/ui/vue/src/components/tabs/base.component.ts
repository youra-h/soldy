import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { TabsDescriptor, TabsCollectionDescriptor } from '@soldy-ui/setup'
import type { ITabs } from '@soldy-ui/core'

export const emitsTabs: TEmits = [
	...useEmits(TabsDescriptor()),
	...useEmits(TabsCollectionDescriptor()),
]

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
