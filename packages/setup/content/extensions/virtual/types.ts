/**
 * Контракты окна: подключение коллекции к окну обёртки `Virtual` и опции расширений.
 */

import type { TCollectionEngine } from '@soldy-ui/core'
import type { IPluginBundle } from '@soldy-ui/plugins'
import type { TElevatorFactory } from '../../../protected/adapter/elevator'

/**
 * Подключить коллекцию к окну обёртки: её движок и набор плагинов. Отдаёт
 * снятие — коллекция зовёт его, когда её уничтожают.
 */
export type TVirtualAttach = (
	engine: TCollectionEngine<any, any>,
	bundle: IPluginBundle | null,
) => () => void

export interface IVirtualExtensionOptions {
	elevator: TElevatorFactory
}

export interface IVirtualCollectionExtensionOptions {
	elevator: TElevatorFactory
}
