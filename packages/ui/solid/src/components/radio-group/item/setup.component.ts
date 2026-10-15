/**
 * setupRadioGroupItem — setup-слой радио.
 *
 * Два контекста, как у элементов Vue и Svelte: собственный
 * (`RadioGroupItemDescriptor` — значение, имя, выключенность) и фасада
 * (`RadioGroupCollectionItemDescriptor` — отмечено ли радио в группе).
 * Расширение элемента берёт лифтом движок и регистратор группы — из слоя,
 * который радио увидело при сборке (`useElevator`), — и отдаёт фасаду
 * контекст радио.
 *
 * В коллекцию радио входит, когда контекст фасада принят, — при выполнении
 * тела компонента, и на сервере тоже: общий `name` и отметка у радио разметки
 * есть в серверной разметке.
 *
 * `context` отдаётся разметке явно: отметка пользователем — свойство
 * item-адаптера активации.
 */

import {
	RadioGroupCollectionItemDescriptor,
	RadioGroupItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	useElevator,
} from '../../../adapter'
import type { RadioGroupItemProps } from './base.component'

export function setupRadioGroupItem(props: RadioGroupItemProps) {
	const { elevator } = useElevator()
	const adapter = createSolidAdapterContext(RadioGroupItemDescriptor(), {
		ctrl: props.ctrl,
		props,
	})
	const owner = useAdapter(adapter, props)

	const item = createSolidAdapterContext(
		RadioGroupCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator })

	const facade = useCollectionAdapter(item, props, owner.forwardProps)

	return {
		ctrl: owner.ctrl,
		plugins: owner.plugins,
		ref: owner.ref,
		// Из фасада разметке нужна только отметка. Место в коллекции (`order`)
		// корню не отдаётся: группа радио не раскладывает — они стоят где
		// угодно, хоть в строках чужого списка, — и номер увёл бы радио по
		// чужому флекс-ряду. Так и у Vue: у радио нет привязки `order`
		state: joinState(owner.state, {
			get active() {
				return facade.state.active
			},
		}),
		context: item.instance.context,
		forwardProps: facade.forwardProps,
	}
}
