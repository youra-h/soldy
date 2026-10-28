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
		).use(TCollectionItemExtension, { item: adapter.instance, member: adapter, elevator })

		return [adapter, item] as const
	})

	const owner = useAdapter(adapter, props)
	const { forwardProps, state } = useCollectionAdapter(owner, item, props)

	return {
		...owner,
		forwardProps,
		state: { ...owner.state, active: state.active },
		// Разметке: отметка пользователем — свойство item-адаптера активации
		context: item.instance.context,
	}
}
