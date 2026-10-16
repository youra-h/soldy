import { createComponentEngine } from '../../../base/collection/create/internal'
import type { TCreateEngineOptions } from '../../../base'
import { toastsExtensions } from './factory'
import type { TToastsCollection } from './types'
import type { IToasts } from '../types'
import type { IToastsItem } from '../item/types'

/**
 * Коллекция Toasts целиком. `owner` необязателен: владелец — опция движка, его
 * пишет `<Toasts>`, когда движок передадут компоненту, или код —
 * `engine.options.set({ owner })`.
 *
 * Код вне компонентов показывает тосты тем же API, что и `useToasts()`:
 * `engine.extensions.toasts.show(…)`.
 */
export function createEngineToasts(
	options: TCreateEngineOptions<IToastsItem> & { owner?: IToasts } = {},
): TToastsCollection {
	return createComponentEngine(toastsExtensions(), options)
}
