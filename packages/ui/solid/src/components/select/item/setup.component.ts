/**
 * setupSelectItem — setup-слой опции Select.
 *
 * Два контекста, как у элементов Vue и Svelte: собственный
 * (`SelectItemDescriptor` — текст и значение опции) и фасада
 * (`SelectCollectionItemDescriptor` — выбор, порядок, сторона отметки).
 * Расширение элемента берёт лифтом движок и регистратор Select — из слоя,
 * который опция увидела при сборке (`useElevator`), — и отдаёт фасаду
 * контекст опции.
 *
 * В коллекцию опция входит, когда контекст фасада принят, — при выполнении
 * тела компонента. Опции стоят в панели, а её содержимое портал собирает с
 * первым чтением: на сервере их нет, в браузере они входят после тела Select.
 *
 * `context` отдаётся разметке явно: выбор — метод item-адаптера.
 */

import {
	SelectCollectionItemDescriptor,
	SelectItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	useElevator,
} from '../../../adapter'
import type { SelectItemProps } from './base.component'

export function setupSelectItem(props: SelectItemProps) {
	const { elevator } = useElevator()
	const adapter = createSolidAdapterContext(SelectItemDescriptor(), { ctrl: props.ctrl, props })
	const owner = useAdapter(adapter, props)

	const item = createSolidAdapterContext(
		SelectCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator })

	const facade = useCollectionAdapter(item, props, owner.forwardProps)

	return {
		ctrl: owner.ctrl,
		plugins: owner.plugins,
		ref: owner.ref,
		state: joinState(facade.state, owner.state),
		context: item.instance.context,
		forwardProps: facade.forwardProps,
	}
}
