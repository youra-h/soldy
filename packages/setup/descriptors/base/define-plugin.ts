/**
 * definePlugin — создаёт определение плагина.
 * Namespace извлекается из Symbol.key.description.
 */

import type { IContribution } from '@soldy/accessor'
import type { IPluginDefinition } from './types'

export function definePlugin(options: {
    ctor: any
    contribution?: IContribution
}): IPluginDefinition {
    const key: symbol = options.ctor.key
    // Namespace извлекаем из описания символа плагина
    const namespace: string =
        key.description || String(key).replace(/^Symbol\((.*)\)$/, '$1')

    return {
        ctor: options.ctor,
        contribution: options.contribution,
        key,
        namespace,
    }
}
