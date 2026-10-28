import {
	MenuCollectionRadioItemDescriptor,
	MenuRadioItemDescriptor,
	TCollectionItemExtension,
	TMenuRadioItemExtension,
} from '@soldy-ui/setup'
import { useAdapter, useAdapterContext, useCollectionAdapter } from '../../../adapter'
import type { MenuRadioItemProps } from './base.component'

export function useSetupMenuRadioItem(props: MenuRadioItemProps) {
	const {
		contexts: [adapter, item],
	} = useAdapterContext((create, elevator) => {
		const adapter = create(MenuRadioItemDescriptor(), { ctrl: props.ctrl, props }).use(
			TMenuRadioItemExtension,
			{ elevator },
		)

		const item = create(
			MenuCollectionRadioItemDescriptor(),
			{ props },
			{ bundle: adapter.bundle },
		).use(TCollectionItemExtension, { adapter, elevator })

		return [adapter, item] as const
	})

	return {
		...useCollectionAdapter(useAdapter(adapter, props), item, props),
		context: item.instance.context,
	}
}
