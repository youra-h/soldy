/**
 * Типы адаптеров — результат createAdapter и контракт декораторов.
 */

import type { IPluginBundle } from '@soldy/plugins'
import type { TComponentAccessor } from '@soldy/accessor'

/** Адаптер: instance + bundle + опционально accessor. */
export interface IAdapter {
    instance: Record<string, any>
    bundle: IPluginBundle
    accessor?: TComponentAccessor
}
