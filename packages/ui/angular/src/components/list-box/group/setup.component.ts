import { ListBoxGroupDescriptor } from '@soldy-ui/setup'
import type { IItemGroup } from '@soldy-ui/core'
import { createAngularAdapterContext, useAdapter } from '../../../adapter'
import type { TBinding } from '../../../adapter'

/**
 * setupListBoxGroup — setup-слой группы ListBox.
 *
 * Контекст один: в коллекцию группа не входит, её элементы — элементы списка,
 * и движок они читают из слоя лифта списка сквозь группу — своего слоя у
 * группы нет.
 */
export function setupListBoxGroup(
	ctrl: IItemGroup | undefined,
	props: object,
): TBinding<IItemGroup> {
	const adapter = createAngularAdapterContext(ListBoxGroupDescriptor(), { ctrl, props })

	return useAdapter(adapter)
}
