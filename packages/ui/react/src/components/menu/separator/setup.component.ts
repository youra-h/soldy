/**
 * useSetupMenuSeparator — setup-слой разделителя меню (аналог setup.component.ts во Vue).
 *
 * Контекст один и без проводки: в коллекцию меню разделитель не входит, и
 * навигация его пропускает.
 */

import { MenuSeparatorDescriptor } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../../adapter'
import type { MenuSeparatorProps } from './base.component'

export function useSetupMenuSeparator(props: MenuSeparatorProps) {
	const { contexts: adapter } = useAdapterContext((create) =>
		create(MenuSeparatorDescriptor(), { ctrl: props.ctrl, props }),
	)

	return useAdapter(adapter, props)
}
