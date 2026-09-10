import { toRaw } from 'vue'
import {
	createAdapterContext,
	TCollectionExtension,
	TDragAndDropCollectionExtension,
	AccordionDescriptor,
	AccordionCollectionDescriptor,
} from '@soldy/setup'
import { TAccordionCollectionFacade } from '@soldy/core'
import type { IAccordionCollectionProps } from '@soldy/core'
import { useAdapter, useCollectionAdapter, VueElevatorFactory } from '../../adapter'
import BaseAccordion, { type AccordionProps } from './base.component'
import { type IAccordionProps, type IAccordionComponentProps, type IAccordion } from '@soldy/core'

export default {
	name: '_Accordion',
	extends: BaseAccordion,
	setup(props: AccordionProps, { emit }: any) {
		const adapter = createAdapterContext(AccordionDescriptor(), {
			ctrl: toRaw(props.ctrl),
			props,
		})

		const refs = useAdapter<IAccordionComponentProps, IAccordion>(adapter, props, emit)

		const collectionAdapter = createAdapterContext(
			AccordionCollectionDescriptor(),
			{
				props,
				// Готовая коллекция снаружи. Дали — фасад работает на ней и своей
				// не создаёт, лишь доложит недостающие расширения в неё же.
				// Не дали — соберёт свою. Развилка в `resolveEngine`
				options: { owner: adapter.instance, engine: toRaw(props.engine) },
			},
			{ bundle: adapter.bundle, defaultExtensions: [] },
		)
			.use(TCollectionExtension, { elevator: VueElevatorFactory })
			.use(TDragAndDropCollectionExtension, { elevator: VueElevatorFactory })

		const refsCollection = useCollectionAdapter<
			IAccordionCollectionProps,
			TAccordionCollectionFacade
		>(collectionAdapter, props, emit)

		return { ...refs, ...refsCollection }
	},
}
