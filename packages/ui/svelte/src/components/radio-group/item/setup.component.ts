/**
 * setupRadioGroupItem — setup-слой радио.
 *
 * Два контекста, как у элементов Vue: собственный (`RadioGroupItemDescriptor`
 * — значение, имя, выключенность) и фасада
 * (`RadioGroupCollectionItemDescriptor` — отмечено ли радио в группе).
 * Расширение элемента берёт лифтом движок и регистратор группы и отдаёт
 * фасаду контекст радио.
 *
 * В коллекцию радио входит, когда контекст фасада принят, — при
 * инициализации компонента, и на сервере тоже: общий `name` и отметка у радио
 * разметки есть в серверной разметке.
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
	createSvelteAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	useElevator,
	type TRootReceiver,
} from '../../../adapter'
import type { RadioGroupItemProps } from './base.component'

export function setupRadioGroupItem(
	getProps: () => RadioGroupItemProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const elevator = useElevator()
	const props = getProps()
	const adapter = createSvelteAdapterContext(RadioGroupItemDescriptor(), {
		ctrl: props.ctrl,
		props,
		mountId,
	})
	const owner = useAdapter(adapter, getProps, receive)

	const item = createSvelteAdapterContext(
		RadioGroupCollectionItemDescriptor(),
		{ props, mountId },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator })

	const facade = useCollectionAdapter(item, getProps, () => owner.forwardProps)

	return {
		ctrl: owner.ctrl,
		plugins: owner.plugins,
		attachElement: owner.attachElement,
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

		get forwardProps() {
			return facade.forwardProps
		},
	}
}
