/**
 * setupSelectGroup — setup-слой группы опций Select.
 *
 * Контекст один: в коллекцию группа не входит, её опции — опции Select, и
 * движок они читают лифтом Select сквозь группу. Id монтирования
 * (`$props.id()`) и приёмник корня отдаёт компонент: компилятор пускает их
 * только туда.
 *
 * В группировку Select группа входит своей проводкой (`TItemGroupExtension`):
 * ключ группы она опускает опциям внутри лифтом (`setContext`), а подпись
 * регистрирует в группировке.
 */

import { SelectGroupDescriptor, TItemGroupExtension } from '@soldy-ui/setup'
import {
	SvelteElevatorFactory,
	createSvelteAdapterContext,
	useAdapter,
	type TRootReceiver,
} from '../../../adapter'
import type { SelectGroupProps } from './base.component'

export function setupSelectGroup(
	getProps: () => SelectGroupProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const adapter = createSvelteAdapterContext(SelectGroupDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	}).use(TItemGroupExtension, { elevator: SvelteElevatorFactory })

	return useAdapter(adapter, getProps, receive)
}
