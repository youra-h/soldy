import {
	TCollectionItemExtension,
	AccordionItemDescriptor,
	AccordionCollectionItemDescriptor,
} from '@soldy/setup'
import {
	useAdapter,
	VueElevatorFactory,
	useIcon,
	useSplitAttrs,
	createVueAdapterContext,
	type SetupContext,
} from '../../../adapter'
import BaseAccordionItem, { type AccordionItemProps } from './base.component'

export default {
	name: '_AccordionItem',
	inheritAttrs: false,
	extends: BaseAccordionItem,
	setup(props: AccordionItemProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(AccordionItemDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		const itemAdapter = createVueAdapterContext(
			AccordionCollectionItemDescriptor(),
			{ props },
			{ bundle: adapter.bundle },
		).use(TCollectionItemExtension, {
			item: adapter.instance,
			elevator: VueElevatorFactory,
		})

		const itemBinding = useAdapter(itemAdapter, props, emit)
		const ownerBinding = useAdapter(adapter, props, emit)

		return {
			...itemBinding,
			...ownerBinding,
			context: itemAdapter.instance.context,
			arrowIconTag: useIcon('arrowRight'),
			...useSplitAttrs(),
		}
	},
}
