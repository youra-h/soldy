/**
 * setupMenuGroup — setup-слой группы меню.
 *
 * Контекст один: в коллекцию группа не входит, её пункты — пункты меню, и
 * движок они читают лифтом меню сквозь группу. В группировку меню группа
 * входит своей проводкой (`TItemGroupExtension`), как группа ListBox: ключ
 * группы она опускает пунктам внутри в слой своего лифта (`useElevator`),
 * детям его отдаёт `Elevate` в разметке, а подпись регистрирует в
 * группировке.
 */

import { MenuGroupDescriptor, TItemGroupExtension } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter, useElevator } from '../../../adapter'
import type { MenuGroupProps } from './base.component'

export function setupMenuGroup(props: MenuGroupProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(MenuGroupDescriptor(), {
		ctrl: props.ctrl,
		props,
	}).use(TItemGroupExtension, { elevator })

	return { ...useAdapter(adapter, props), layer }
}
