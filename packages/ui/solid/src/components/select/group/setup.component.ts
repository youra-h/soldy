/**
 * setupSelectGroup — setup-слой группы опций Select.
 *
 * Контекст один: в коллекцию группа не входит, её опции — опции Select, и
 * движок они читают лифтом Select сквозь группу. Тело компонента Solid
 * выполняется один раз, поэтому контекст — обычная константа.
 *
 * В группировку Select группа входит своей проводкой (`TItemGroupExtension`):
 * ключ группы она опускает опциям внутри в слой своего лифта (`useElevator`),
 * детям его отдаёт `Elevate` в разметке, а подпись регистрирует в
 * группировке.
 */

import { SelectGroupDescriptor, TItemGroupExtension } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter, useElevator } from '../../../adapter'
import type { SelectGroupProps } from './base.component'

export function setupSelectGroup(props: SelectGroupProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(SelectGroupDescriptor(), {
		ctrl: props.ctrl,
		props,
	}).use(TItemGroupExtension, { elevator })

	return { ...useAdapter(adapter, props), layer }
}
