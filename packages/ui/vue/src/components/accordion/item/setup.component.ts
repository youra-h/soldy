import {
	TCollectionItemExtension,
	AccordionItemDescriptor,
	AccordionCollectionItemDescriptor,
} from '@soldy-ui/setup'
import {
	useAdapter,
	extendBinding,
	joinBindings,
	useCollectionAdapter,
	useExpose,
	VueElevatorFactory,
	roleIcon,
	useSplitAttrs,
	createVueAdapterContext,
	type SetupContext,
} from '../../../adapter'
import BaseAccordionItem, { type AccordionItemProps } from './base.component'

export default {
	name: '_AccordionItem',
	inheritAttrs: false,
	extends: BaseAccordionItem,
	expose: useExpose(),
	setup(props: AccordionItemProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(AccordionItemDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		const itemAdapter = createVueAdapterContext(
			AccordionCollectionItemDescriptor(),
			{ props },
			{ bundle: adapter.bundle },
		).use(TCollectionItemExtension, { adapter, elevator: VueElevatorFactory })

		const itemBinding = useCollectionAdapter(itemAdapter, props, emit)
		const ownerBinding = useAdapter(adapter, props, emit)

		return extendBinding(joinBindings(ownerBinding, itemBinding), {
			context: itemAdapter.instance.context,
			arrowIconTag: roleIcon('arrowRight'),
			...useSplitAttrs(),
		})
	},
}
