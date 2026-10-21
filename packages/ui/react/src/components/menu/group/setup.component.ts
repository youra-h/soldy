/**
 * useSetupMenuGroup — setup-слой группы меню (аналог setup.component.ts во Vue).
 *
 * Контекст один: в коллекцию группа не входит, её пункты — пункты меню, и
 * движок они читают лифтом меню сквозь группу. В группировку меню группа
 * входит своей проводкой (`TItemGroupExtension`), как группа ListBox: ключ
 * группы она опускает пунктам внутри в слой своего лифта, детям его отдаёт
 * `Elevate` в разметке, а подпись регистрирует в группировке.
 */

import { MenuGroupDescriptor, TItemGroupExtension } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../../adapter'
import type { MenuGroupProps } from './base.component'

export function useSetupMenuGroup(props: MenuGroupProps) {
	const { contexts: adapter, layer } = useAdapterContext((create, elevator) =>
		create(MenuGroupDescriptor(), { ctrl: props.ctrl, props }).use(TItemGroupExtension, {
			elevator,
		}),
	)

	return { ...useAdapter(adapter, props), layer }
}
