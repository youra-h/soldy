import {
	TCollectionExtension,
	TDragAndDropCollectionExtension,
	AccordionDescriptor,
	AccordionCollectionDescriptor,
} from '@soldy/setup'
import { TAccordionCollectionFacade } from '@soldy/core'
import type { IAccordionCollectionProps } from '@soldy/core'
import {
	useAdapter,
	useCollectionAdapter,
	VueElevatorFactory,
	createVueAdapterContext,
	type SetupContext,
} from '../../adapter'
import BaseAccordion, { type AccordionProps } from './base.component'
import { type IAccordionComponentProps, type IAccordion } from '@soldy/core'

export default {
	name: '_Accordion',
	extends: BaseAccordion,
	setup(props: AccordionProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(AccordionDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		const refs = useAdapter<IAccordionComponentProps, IAccordion>(adapter, props, emit)

		const collectionAdapter = createVueAdapterContext(
			AccordionCollectionDescriptor(),
			{
				props,
				// Готовая коллекция снаружи. Дали — фасад работает на ней и своей
				// не создаёт, лишь доложит недостающие расширения в неё же.
				// Не дали — соберёт свою. Развилка в `resolveEngine`
				options: { owner: adapter.instance, engine: props.engine },
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
