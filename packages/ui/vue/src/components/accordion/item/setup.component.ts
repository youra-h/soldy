import {
	TCollectionItemExtension,
	AccordionItemDescriptor,
	AccordionCollectionItemDescriptor,
} from '@soldy/setup'
import { TAccordionItemCollectionFacade } from '@soldy/core'
import type { IAccordionItemProps, IAccordionItem } from '@soldy/core'
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
			{ bundle: adapter.bundle, defaultExtensions: [] },
		).use(TCollectionItemExtension, {
			item: adapter.instance,
			elevator: VueElevatorFactory,
		})

		const itemBinding = useAdapter<AccordionItemProps, TAccordionItemCollectionFacade>(
			itemAdapter,
			props,
			emit,
		)
		const ownerBinding = useAdapter<IAccordionItemProps, IAccordionItem>(adapter, props, emit)

		return {
			...itemBinding,
			...ownerBinding,
			context: itemAdapter.instance.context,
			arrowIconTag: useIcon('arrowRight'),
			...useSplitAttrs(),
		}
	},
}
