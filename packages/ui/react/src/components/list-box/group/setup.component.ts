/**
 * useSetupListBoxGroup — setup-слой группы ListBox (аналог setup.component.ts
 * во Vue). Контекст один: в коллекцию группа не входит, её элементы — элементы
 * списка, и движок они читают лифтом списка сквозь группу.
 *
 * В группировку списка группа входит своей проводкой (`TItemGroupExtension`):
 * ключ группы она опускает элементам внутри в слой своего лифта, детям его
 * отдаёт `Elevate` в разметке, а подпись регистрирует в группировке.
 */

import { ListBoxGroupDescriptor, TItemGroupExtension } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../../adapter'
import type { ListBoxGroupProps } from './base.component'

export function useSetupListBoxGroup(props: ListBoxGroupProps) {
	const { contexts: adapter, layer } = useAdapterContext((create, elevator) =>
		create(ListBoxGroupDescriptor(), { ctrl: props.ctrl, props }).use(TItemGroupExtension, {
			elevator,
		}),
	)

	return { ...useAdapter(adapter, props), layer }
}
