import { ListBoxGroupDescriptor, TItemGroupExtension } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter, useElevator } from '../../../adapter'
import type { ListBoxGroupProps } from './base.component'

/** В коллекцию группа не входит: `TItemGroupExtension` опускает элементам её ключ. */
export function setupListBoxGroup(props: ListBoxGroupProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(ListBoxGroupDescriptor(), {
		ctrl: props.ctrl,
		props,
	}).use(TItemGroupExtension, { elevator })

	return { ...useAdapter(adapter, props), layer }
}
