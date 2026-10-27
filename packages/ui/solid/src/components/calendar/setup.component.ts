import {
	CalendarCollectionDescriptor,
	CalendarDescriptor,
	TCollectionExtension,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	useAdapter,
	joinBindings,
	useCollectionAdapter,
	useElevator,
} from '../../adapter'
import type { CalendarProps } from './base.component'

/** `engine` снаружи держит тот, кто зовёт команды расширений календаря, — панель DatePicker. */
export function setupCalendar(props: CalendarProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(CalendarDescriptor(), {
		ctrl: props.ctrl,
		props,
	})

	const collectionAdapter = createSolidAdapterContext(
		CalendarCollectionDescriptor(),
		{
			props,
			options: { owner: adapter.instance, engine: props.engine },
		},
		{ bundle: adapter.bundle },
	).use(TCollectionExtension, { elevator })

	const collectionBinding = useCollectionAdapter(collectionAdapter, props)
	const owner = useAdapter(adapter, props)

	return { ...joinBindings(owner, collectionBinding), layer }
}
