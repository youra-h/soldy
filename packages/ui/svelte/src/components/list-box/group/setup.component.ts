/**
 * setupListBoxGroup — setup-слой группы ListBox.
 *
 * Контекст один: в коллекцию группа не входит, её элементы — элементы списка,
 * и движок они читают лифтом списка сквозь группу. Id монтирования
 * (`$props.id()`) и приёмник корня отдаёт компонент: компилятор пускает их
 * только туда.
 *
 * В группировку списка группа входит своей проводкой (`TItemGroupExtension`):
 * ключ группы она опускает элементам внутри лифтом (`setContext`), а подпись
 * регистрирует в группировке.
 */

import { ListBoxGroupDescriptor, TItemGroupExtension } from '@soldy-ui/setup'
import {
	createSvelteAdapterContext,
	useAdapter,
	useElevator,
	type TRootReceiver,
} from '../../../adapter'
import type { ListBoxGroupProps } from './base.component'

export function setupListBoxGroup(
	getProps: () => ListBoxGroupProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const elevator = useElevator()
	const adapter = createSvelteAdapterContext(ListBoxGroupDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	}).use(TItemGroupExtension, { elevator })

	return useAdapter(adapter, getProps, receive)
}
