import {
	TCollectionItemExtension,
	PaginationItemDescriptor,
	PaginationCollectionItemDescriptor,
} from '@soldy-ui/setup'
import {
	useAdapter,
	extendBinding,
	joinBindings,
	useCollectionAdapter,
	useExpose,
	VueElevatorFactory,
	createVueAdapterContext,
	type SetupContext,
} from '../../../adapter'
import BasePaginationItem, { type PaginationItemProps } from './base.component'

/**
 * Страница пагинации: свой контекст и контекст фасада страницы на одном
 * наборе. Своего у страницы в разметке нет — ключ, текст и наборы ей пишет
 * расширение коллекции, а текущей её делает активация коллекции по нажатию.
 */
export default {
	name: '_PaginationItem',
	extends: BasePaginationItem,
	expose: useExpose(),
	setup(props: PaginationItemProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(PaginationItemDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		const itemAdapter = createVueAdapterContext(
			PaginationCollectionItemDescriptor(),
			{ props },
			{ bundle: adapter.bundle },
		).use(TCollectionItemExtension, {
			item: adapter.instance,
			member: adapter,
			elevator: VueElevatorFactory,
		})

		const itemBinding = useCollectionAdapter(itemAdapter, props, emit)
		const ownerBinding = useAdapter(adapter, props, emit)

		return extendBinding(joinBindings(ownerBinding, itemBinding), {
			/** Контекст страницы в коллекции — нажатие делает её текущей, как у таба */
			context: itemAdapter.instance.context,
		})
	},
}
