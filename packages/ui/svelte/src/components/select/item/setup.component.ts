/**
 * setupSelectItem — setup-слой опции Select.
 *
 * Два контекста, как у элементов Vue: собственный (`SelectItemDescriptor` —
 * текст и значение опции) и фасада (`SelectCollectionItemDescriptor` — выбор,
 * порядок, сторона отметки). Расширение элемента берёт лифтом движок и
 * регистратор Select и отдаёт фасаду контекст опции.
 *
 * В коллекцию опция входит, когда контекст фасада принят, — при
 * инициализации компонента. Опции стоят в панели, а её `Teleport` монтирует
 * эффектом: на сервере их нет, в браузере они входят после гидратации.
 *
 * `context` отдаётся разметке явно: выбор — метод item-адаптера.
 */

import {
	SelectCollectionItemDescriptor,
	SelectItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import {
	SvelteElevatorFactory,
	createSvelteAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	type TRootReceiver,
} from '../../../adapter'
import type { SelectItemProps } from './base.component'

export function setupSelectItem(
	getProps: () => SelectItemProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const props = getProps()
	const adapter = createSvelteAdapterContext(SelectItemDescriptor(), {
		ctrl: props.ctrl,
		props,
		mountId,
	})
	const owner = useAdapter(adapter, getProps, receive)

	const item = createSvelteAdapterContext(
		SelectCollectionItemDescriptor(),
		{ props, mountId },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator: SvelteElevatorFactory })

	const facade = useCollectionAdapter(item, getProps, () => owner.forwardProps)

	return {
		ctrl: owner.ctrl,
		plugins: owner.plugins,
		attachElement: owner.attachElement,
		state: joinState(facade.state, owner.state),
		context: item.instance.context,

		get forwardProps() {
			return facade.forwardProps
		},
	}
}
