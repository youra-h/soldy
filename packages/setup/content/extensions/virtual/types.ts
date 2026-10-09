/**
 * Контракты окна: подключение коллекции к окну обёртки `Virtual` и опции расширений.
 */

import type { TCollectionEngine } from '@soldy-ui/core'
import type { IPluginBundle } from '@soldy-ui/plugins'
import type { TElevatorFactory } from '../../../protected/adapter/elevator'

/**
 * Подключить коллекцию к окну обёртки: её движок и набор плагинов. Зовёт его
 * сборка коллекции, и сразу подключение делает только то, что принадлежит
 * коллекции, — плагин замера в её набор и стратегию в её рисование по
 * текущему `enabled`. Остальное коллекция ведёт по фазам своего контекста —
 * через подключение, которое получила.
 */
export type TVirtualConnect = (
	engine: TCollectionEngine<any, any>,
	bundle: IPluginBundle | null,
) => IVirtualConnection

/**
 * Подключение коллекции к окну — по фазам её контекста. Шина обёртки для
 * коллекции чужая, поэтому на выключатель подписывается только принятая
 * коллекция: собранную фреймворк вправе выбросить, так и не приняв, и
 * подписка сборки осталась бы на живой обёртке.
 */
export interface IVirtualConnection {
	/**
	 * Коллекцию приняли (`attach` контекста): окно идёт за выключателем обёртки
	 * и применяет его ещё раз — выключатель мог смениться между сборкой и
	 * приёмом.
	 */
	attach(): void
	/**
	 * Коллекцию уничтожили (`destroy` контекста), принятую или нет: отписка от
	 * выключателя, если подписка была, и рисование всех элементов — движок мог
	 * прийти снаружи и пережить компонент.
	 */
	destroy(): void
}

export interface IVirtualExtensionOptions {
	elevator: TElevatorFactory
}

export interface IVirtualCollectionExtensionOptions {
	elevator: TElevatorFactory
}
