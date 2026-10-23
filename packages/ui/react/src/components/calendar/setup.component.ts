import {
	CalendarCollectionDescriptor,
	CalendarDescriptor,
	TCollectionExtension,
} from '@soldy-ui/setup'
import { useAdapter, useAdapterContext, useCollectionAdapter } from '../../adapter'
import type { CalendarProps } from './base.component'

export function useSetupCalendar(props: CalendarProps) {
	const {
		contexts: [adapter, collectionAdapter],
		layer,
	} = useAdapterContext((create, elevator) => {
		const adapter = create(CalendarDescriptor(), { ctrl: props.ctrl, props })

		const collectionAdapter = create(
			CalendarCollectionDescriptor(),
			{
				props,
				// Движок снаружи: дали — фасад работает на нём, нет — соберёт свой
				options: { owner: adapter.instance, engine: props.engine },
			},
			{ bundle: adapter.bundle },
		).use(TCollectionExtension, { elevator })

		return [adapter, collectionAdapter] as const
	})

	return {
		...useCollectionAdapter(useAdapter(adapter, props), collectionAdapter, props),
		layer,
	}
}
