/**
 * setupListBoxGroup — setup-слой группы ListBox.
 *
 * Контекст один: в коллекцию группа не входит, её элементы — элементы списка,
 * и движок они читают лифтом списка сквозь группу. Тело компонента Solid
 * выполняется один раз, поэтому контекст — обычная константа.
 *
 * В группировку списка группа входит своей проводкой (`TItemGroupExtension`):
 * ключ группы она опускает элементам внутри в слой своего лифта
 * (`useElevator`), детям его отдаёт `Elevate` в разметке, а подпись
 * регистрирует в группировке.
 */

import { ListBoxGroupDescriptor, TItemGroupExtension } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter, useElevator } from '../../../adapter'
import type { ListBoxGroupProps } from './base.component'

export function setupListBoxGroup(props: ListBoxGroupProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(ListBoxGroupDescriptor(), {
		ctrl: props.ctrl,
		props,
	}).use(TItemGroupExtension, { elevator })

	return { ...useAdapter(adapter, props), layer }
}
