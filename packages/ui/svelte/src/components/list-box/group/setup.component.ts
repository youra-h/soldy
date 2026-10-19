/**
 * setupListBoxGroup — setup-слой группы ListBox.
 *
 * Контекст один: в коллекцию группа не входит, её элементы — элементы списка,
 * и движок они читают лифтом списка сквозь группу. Id монтирования
 * (`$props.id()`) и приёмник корня отдаёт компонент: компилятор пускает их
 * только туда.
 */

import { ListBoxGroupDescriptor } from '@soldy-ui/setup'
import { createSvelteAdapterContext, useAdapter, type TRootReceiver } from '../../../adapter'
import type { ListBoxGroupProps } from './base.component'

export function setupListBoxGroup(
	getProps: () => ListBoxGroupProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const adapter = createSvelteAdapterContext(ListBoxGroupDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	})

	return useAdapter(adapter, getProps, receive)
}
