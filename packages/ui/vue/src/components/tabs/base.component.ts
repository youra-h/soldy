// import { BaseControl } from '../control'
// import { useEmits, useProps, useCollectionEmits, useCollectionProps } from '../../adapter'
// import type { TEmits, TProps } from '../../types/common'
// import { TabsDescriptor, TabsCollectionDescriptor } from '@soldy/setup'

// const componentEmits = useEmits(TabsDescriptor) as string[]
// const collectionEmits = useCollectionEmits(TabsCollectionDescriptor) as string[]

// export const emitsTabs: TEmits = [...componentEmits, ...collectionEmits] as unknown as TEmits

// export const propsTabs: TProps = {
// 	...useProps(TabsDescriptor),
// 	...useCollectionProps(TabsCollectionDescriptor),
// } as TProps

// export default {
// 	name: 'BaseTabs',
// 	extends: BaseControl,
// 	emits: emitsTabs,
// 	props: propsTabs,
// }

import { BaseControl } from '../control'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps } from '../../types/common'
import { TabsDescriptor } from '@soldy/setup'

export const emitsTabs: TEmits = useEmits(TabsDescriptor) as unknown as TEmits

export const propsTabs: TProps = {
	...(useProps(TabsDescriptor) as TProps),
	items: {
		type: Array,
		default: () => [],
	},
}

export default {
	name: 'BaseTabs',
	extends: BaseControl,
	emits: emitsTabs,
	props: propsTabs,
}
