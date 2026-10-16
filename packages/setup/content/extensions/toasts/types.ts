/**
 * Контракты проводки тостов: фасад, у которого берут API, и опции расширения.
 */

import type { IToastsApi } from '@soldy-ui/core'
import type { TElevatorFactory } from '../../../protected/adapter/elevator'

/**
 * Инстанс, к которому подключается расширение: фасад коллекции, в движке
 * которого стоит очередь тостов (`toasts`).
 */
export type TToastsApiOwner = {
	readonly engine: { readonly extensions: { readonly toasts: IToastsApi } }
}

export interface IToastsApiExtensionOptions {
	elevator: TElevatorFactory
}
