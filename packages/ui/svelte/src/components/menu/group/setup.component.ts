/**
 * setupMenuGroup — setup-слой группы меню.
 *
 * Контекст один: в коллекцию группа не входит, её пункты — пункты меню, и
 * движок они читают лифтом меню сквозь группу. Id монтирования
 * (`$props.id()`) и приёмник корня отдаёт компонент: компилятор пускает их
 * только туда.
 *
 * В группировку коллекции меню группа входит своей проводкой
 * (`TItemGroupExtension`): ключ группы она опускает пунктам внутри лифтом
 * (`setContext`), а подпись регистрирует в группировке.
 */

import { MenuGroupDescriptor, TItemGroupExtension } from '@soldy-ui/setup'
import {
	createSvelteAdapterContext,
	useAdapter,
	useElevator,
	type TRootReceiver,
} from '../../../adapter'
import type { MenuGroupProps } from './base.component'

export function setupMenuGroup(
	getProps: () => MenuGroupProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const elevator = useElevator()
	const adapter = createSvelteAdapterContext(MenuGroupDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	}).use(TItemGroupExtension, { elevator })

	return useAdapter(adapter, getProps, receive)
}
