/**
 * Ключ лифта тостов: менеджер `Toasts` опускает по нему API тостов своему поддереву.
 *
 * Лежит отдельно от проводки менеджера, как ключ окна (`VIRTUAL_ELEVATOR`):
 * адаптеру, чтобы взять API (`useToasts()`), нужен только ключ. Лифт берёт
 * любой ключ, поэтому ключ — в наполнении, а не в механике лифта.
 */

import type { IToastsApi } from '@soldy-ui/core'
import type { IElevatorKey } from '../../../protected/adapter/elevator'

/** API тостов ближайшего `Toasts` выше по дереву: `show` и тост в ответ. */
export const TOASTS_ELEVATOR: IElevatorKey<IToastsApi> = { name: 'soldy:toasts' }
