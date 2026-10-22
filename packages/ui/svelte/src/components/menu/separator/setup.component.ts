/**
 * setupMenuSeparator — setup-слой разделителя меню.
 *
 * Контекст один и без проводки: в коллекцию меню разделитель не входит, и
 * навигация его пропускает.
 */

import { MenuSeparatorDescriptor } from '@soldy-ui/setup'
import { createSvelteAdapterContext, useAdapter, type TRootReceiver } from '../../../adapter'
import type { MenuSeparatorProps } from './base.component'

export function setupMenuSeparator(
	getProps: () => MenuSeparatorProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const adapter = createSvelteAdapterContext(MenuSeparatorDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	})

	return useAdapter(adapter, getProps, receive)
}
