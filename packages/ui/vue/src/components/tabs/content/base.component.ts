import { useEmits, useProps } from '../../../adapter'
import type { TEmits, TProps, UseProps } from '../../../types/common'
import { TabsContentDescriptor, TabsCollectionContentDescriptor } from '@soldy/setup'
import type { ITabsContent } from '@soldy/core'

export const emitsTabsContent: TEmits = [
	...useEmits(TabsContentDescriptor()),
	...useEmits(TabsCollectionContentDescriptor()),
] as unknown as TEmits

export const propsTabsContent: TProps = {
	...(useProps(TabsContentDescriptor()) as TProps),
	...(useProps(TabsCollectionContentDescriptor()) as TProps),
}

export type TabsContentProps = UseProps<typeof TabsContentDescriptor, ITabsContent>

export default {
	name: 'BaseTabsContent',
	emits: emitsTabsContent,
	props: propsTabsContent,
}
