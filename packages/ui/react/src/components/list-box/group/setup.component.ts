/**
 * useSetupListBoxGroup — setup-слой группы ListBox (аналог setup.component.ts
 * во Vue). Контекст один: в коллекцию группа не входит, её элементы — элементы
 * списка, и движок они читают лифтом списка сквозь группу.
 */

import { ListBoxGroupDescriptor } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../../adapter'
import type { ListBoxGroupProps } from './base.component'

export function useSetupListBoxGroup(props: ListBoxGroupProps) {
	const { contexts: adapter } = useAdapterContext((create) =>
		create(ListBoxGroupDescriptor(), { ctrl: props.ctrl, props }),
	)

	return useAdapter(adapter, props)
}
