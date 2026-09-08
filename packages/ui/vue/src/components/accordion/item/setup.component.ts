import { toRaw } from 'vue'
import {
	createAdapterContext,
	TCollectionItemExtension,
	AccordionItemDescriptor,
	AccordionCollectionItemDescriptor,
} from '@soldy/setup'
import { TAccordionItemCollectionFacade } from '@soldy/core'
import type { IAccordionItemProps, IAccordionItem } from '@soldy/core'
import { useAdapter, VueElevatorFactory, useIcon, useSplitAttrs } from '../../../adapter'
import BaseAccordionItem, { type AccordionItemProps } from './base.component'

export default {
	name: '_AccordionItem',
	inheritAttrs: false,
	extends: BaseAccordionItem,
	setup(props: AccordionItemProps, { emit }: any) {
		const adapter = createAdapterContext(AccordionItemDescriptor(), {
			ctrl: toRaw(props.ctrl),
			props,
		})

		const itemAdapter = createAdapterContext(
			AccordionCollectionItemDescriptor(),
			{ props },
			{ bundle: adapter.bundle, defaultExtensions: [] },
		).use(TCollectionItemExtension, {
			item: adapter.instance,
			elevator: VueElevatorFactory,
		})

		const itemBinding = useAdapter<Record<string, any>, TAccordionItemCollectionFacade>(
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
