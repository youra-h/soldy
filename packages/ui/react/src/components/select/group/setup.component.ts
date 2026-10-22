/**
 * useSetupSelectGroup — setup-слой группы опций Select (аналог
 * setup.component.ts во Vue). Контекст один: в коллекцию группа не входит, её
 * опции — опции Select, и движок они читают лифтом Select сквозь группу.
 *
 * В группировку Select группа входит своей проводкой (`TItemGroupExtension`):
 * ключ группы она опускает опциям внутри в слой своего лифта, детям его
 * отдаёт `Elevate` в разметке, а подпись регистрирует в группировке.
 */

import { SelectGroupDescriptor, TItemGroupExtension } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../../adapter'
import type { SelectGroupProps } from './base.component'

export function useSetupSelectGroup(props: SelectGroupProps) {
	const { contexts: adapter, layer } = useAdapterContext((create, elevator) =>
		create(SelectGroupDescriptor(), { ctrl: props.ctrl, props }).use(TItemGroupExtension, {
			elevator,
		}),
	)

	return { ...useAdapter(adapter, props), layer }
}
