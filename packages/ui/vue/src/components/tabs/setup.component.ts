import { useAdapter, VueElevator, COLLECTION_ELEVATOR } from '../../adapter'
import { TabsDescriptor } from '@soldy/setup'
import BaseTabs from './base.component'
import type { TBaseComponentProps } from '../../types'
import { type ITabsProps, type ITabs } from '@soldy/core'

export default {
	name: '_Tabs',
	extends: BaseTabs,
	setup(props: TBaseComponentProps<ITabsProps, ITabs>, { emit }: any) {
		const collectionElevator = new VueElevator(COLLECTION_ELEVATOR)

		const result = useAdapter(TabsDescriptor, props, emit, {
			elevators: { collection: collectionElevator },
		})

		console.log('setup', result)

		return result
	},
}
