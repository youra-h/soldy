/**
 * TCollectionExtension — единая точка входа для настройки коллекции.
 *
 * Режим фасада: context.instance владеет `engine` (Tabs/Accordion/...).
 *
 * Выполняется: привязка коллекции к реестру bundles,
 * передача коллекции детям через ITEM_CONTEXT_ELEVATOR и регистрация item-ов
 * через COLLECTION_ENGINE_ELEVATOR.
 */

import type { IAdapterContext } from '../../context'
import type { TElevatorFactory } from '../../elevator'
import { COLLECTION_ENGINE_ELEVATOR, ITEM_CONTEXT_ELEVATOR } from '../../elevator/keys'
import { TCollectionBundlesPlugin } from '@soldy/plugins'

export interface ICollectionExtensionOptions {
	elevator: TElevatorFactory
}

export class TCollectionExtension {
	constructor(context: IAdapterContext, options: ICollectionExtensionOptions) {
		const { elevator } = options

		// Фасад-режим: инстанс сам владеет коллекцией (context.instance — фасад).
		const instance = context.instance as any
		const engine = instance?.engine

		if (!engine) {
			throw new Error('Engine is not available in the engine instance.')
		}

		elevator(ITEM_CONTEXT_ELEVATOR).down(engine)

		this._wire(context, elevator, engine)
	}

	/**
	 * Настраивает коллекцию, связывая её с плагинами и регистрируя элементы через лифт.
	 * @param context Контекст адаптера, содержащий информацию о коллекции и её окружении.
	 * @param elevator Лифт для передачи элементов коллекции.
	 * @param engine Коллекция, которую необходимо настроить.
	 */
	private _wire(context: IAdapterContext, elevator: TElevatorFactory, engine: any): void {
		const bundles = context.bundle?.get(TCollectionBundlesPlugin)

		// Передаём ссылку на коллекцию в плагин — это единственный источник
		// состояния коллекции (активный элемент, порядок, элементы) для плагинов.
		if (bundles && engine) {
			bundles.bindEngine(engine)
		}

		const itemElevator = elevator(COLLECTION_ENGINE_ELEVATOR)

		itemElevator.down((instance: any, bundle: any) => {
			// Кто создал элемент, тот им и владеет.
			//
			// Элемент, пришедший из данных (`items`), уже лежит в коллекции — его
			// состав определяют они, а разметка только рисует. Размонтирование
			// такого элемента ничего не значит: список сузился фильтром, ушла
			// страница таблицы, закрылась панель — данные при этом на месте.
			//
			// Элемент, объявленный в разметке, до этого момента коллекции не
			// принадлежал. Для него источник состава — шаблон, и исчезновение из
			// шаблона действительно означает удаление.
			const items = engine?.extensions?.batch?.items
			const owned = !items?.includes(instance)

			// push (а не insert) сохраняет порядок DOM: item-ы приходят через
			// elevator по мере монтирования, поэтому добавляем их последовательно.
			if (owned) engine?.extensions?.plain?.push(instance)

			// Регистрируем bundle элемента (ключ — uid элемента).
			bundles?.register(bundle, instance)

			return () => {
				// Удаление из коллекции эмитит item:removed — реестр bundles
				// очистит запись по этому событию.
				if (owned) engine?.extensions?.plain?.remove(instance)
			}
		})
	}
}
