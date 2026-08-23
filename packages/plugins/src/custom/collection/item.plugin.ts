import { TBasePlugin } from '../../base'
import type { IExtension } from '@soldy/core'

export type TCollectionItemPluginEvents = {}

/**
 * TCollectionItemPlugin — плагин элемента коллекции.
 *
 * Связывает stateless item-расширения
 * с событиями родительской коллекции. Вызывается из adapter-слоя через elevator.
 */
export class TCollectionItemPlugin<T extends object = any> extends TBasePlugin<
	any,
	TCollectionItemPluginEvents
> {
}
