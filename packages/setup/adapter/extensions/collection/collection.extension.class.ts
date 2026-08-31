/**
 * TCollectionExtension — единая точка входа для настройки коллекции.
 *
 * Режим фасада: context.instance владеет `collection` (Tabs/Collapse/...).
 *
 * Выполняется: привязка коллекции к реестру bundles,
 * передача коллекции детям через ITEM_CONTEXT_ELEVATOR и регистрация item-ов
 * через COLLECTION_ELEVATOR.
 */

import type { IAdapterContext } from '../../context'
import type { TElevatorFactory } from '../../elevator'
import { COLLECTION_ELEVATOR, ITEM_CONTEXT_ELEVATOR } from '../../elevator/keys'
import { TCollectionBundlesPlugin } from '@soldy/plugins'

export interface ICollectionExtensionOptions {
	elevator: TElevatorFactory
	/** Готовая коллекция (pass-through из props.engine). */
	engine?: any
}

export class TCollectionExtension {
	constructor(context: IAdapterContext, options: ICollectionExtensionOptions) {
		const { elevator, engine } = options

		// Фасад-режим: инстанс сам владеет коллекцией (context.instance — фасад).
		const facade = context.instance as any
		const fromFacade = facade && typeof facade.collection !== 'undefined' ? facade.collection : undefined

		if (fromFacade) {
			elevator(ITEM_CONTEXT_ELEVATOR).down(fromFacade)
			this._wire(context, elevator, fromFacade)
			return
		}

		// Pass-through: готовая коллекция приходит из props.engine.
		elevator(ITEM_CONTEXT_ELEVATOR).down(engine)
		this._wire(context, elevator, engine)
	}

	private _wire(context: IAdapterContext, elevator: TElevatorFactory, collection: any): void {
		const bundles = context.bundle?.get(TCollectionBundlesPlugin)

		// Передаём ссылку на коллекцию в плагин — это единственный источник
		// состояния коллекции (активный элемент, порядок, элементы) для плагинов.
		if (bundles && collection) {
			bundles.bindCollection(collection)
		}

		const itemElevator = elevator(COLLECTION_ELEVATOR)

		itemElevator.down((instance: any, bundle: any) => {
			// Добавляем элемент в конец коллекции (эмитится item:added).
			// push (а не insert) сохраняет порядок DOM: item-ы приходят через
			// elevator по мере монтирования, поэтому добавляем их последовательно.
			collection?.extensions?.plain?.push(instance)

			// Регистрируем bundle элемента (ключ — uid элемента).
			bundles?.register(bundle, instance)

			return () => {
				// Удаление из коллекции эмитит item:removed — реестр bundles
				// очистит запись по этому событию.
				collection?.extensions?.plain?.remove(instance)
			}
		})
	}
}
