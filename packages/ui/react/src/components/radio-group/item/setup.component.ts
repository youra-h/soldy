/**
 * useSetupRadioGroupItem — setup-слой радио (аналог setup.component.ts во Vue).
 *
 * Два контекста одной сборкой, как у элементов Vue: собственный
 * (`RadioGroupItemDescriptor` — значение, имя, выключенность) и фасада
 * (`RadioGroupCollectionItemDescriptor` — отмечено ли радио в группе).
 * Расширение элемента берёт через лифт движок и регистратор группы и отдаёт
 * фасаду контекст радио.
 *
 * В коллекцию радио входит, когда `useAdapterContext` принимает контексты при
 * коммите, а не на рендере. Пересобранная группа — это новый движок: радио
 * пересобирается вслед за ней, потому что сменилось прочитанное через лифт.
 *
 * `context` отдаётся разметке явно: отметка пользователем — свойство
 * item-адаптера активации.
 */

import {
	RadioGroupCollectionItemDescriptor,
	RadioGroupItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import { useAdapter, useAdapterContext, useCollectionAdapter } from '../../../adapter'
import type { RadioGroupItemProps } from './base.component'

export function useSetupRadioGroupItem(props: RadioGroupItemProps) {
	const {
		contexts: [adapter, item],
	} = useAdapterContext((create, elevator) => {
		const adapter = create(RadioGroupItemDescriptor(), { ctrl: props.ctrl, props })

		const item = create(
			RadioGroupCollectionItemDescriptor(),
			{ props },
			{ bundle: adapter.bundle },
		).use(TCollectionItemExtension, { item: adapter.instance, elevator })

		return [adapter, item] as const
	})

	const owner = useAdapter(adapter, props)
	const facade = useCollectionAdapter(item, props, owner.forwardProps)

	return {
		...owner,
		forwardProps: facade.forwardProps,
		// Из фасада разметке нужна только отметка. Место в коллекции (`order`)
		// корню не отдаётся: группа радио не раскладывает — они стоят где
		// угодно, хоть в строках чужого списка, — и номер увёл бы радио по
		// чужому флекс-ряду. Так и у Vue: у радио нет привязки `order`
		state: { ...owner.state, active: facade.state.active },
		context: item.instance.context,
	}
}
