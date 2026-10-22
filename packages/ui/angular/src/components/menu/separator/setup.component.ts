import { MenuSeparatorDescriptor } from '@soldy-ui/setup'
import type { TMenuSeparator } from '@soldy-ui/core'
import { createAngularAdapterContext, useAdapter } from '../../../adapter'
import type { TBinding } from '../../../adapter'

/**
 * setupMenuSeparator — setup-слой разделителя меню: собирает компонент и
 * связывает его с Angular. В коллекцию разделитель не входит, и навигация его
 * пропускает; роль `separator` пишет ядро.
 */
export function setupMenuSeparator(
	ctrl: TMenuSeparator | undefined,
	props: object,
): TBinding<TMenuSeparator> {
	const adapter = createAngularAdapterContext(MenuSeparatorDescriptor(), { ctrl, props })

	return useAdapter(adapter)
}
