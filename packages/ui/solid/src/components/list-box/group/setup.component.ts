/**
 * setupListBoxGroup — setup-слой группы ListBox.
 *
 * Контекст один: в коллекцию группа не входит, её элементы — элементы списка,
 * и движок они читают лифтом списка сквозь группу. Тело компонента Solid
 * выполняется один раз, поэтому контекст — обычная константа.
 */

import { ListBoxGroupDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter } from '../../../adapter'
import type { ListBoxGroupProps } from './base.component'

export function setupListBoxGroup(props: ListBoxGroupProps) {
	const adapter = createSolidAdapterContext(ListBoxGroupDescriptor(), {
		ctrl: props.ctrl,
		props,
	})

	return useAdapter(adapter, props)
}
