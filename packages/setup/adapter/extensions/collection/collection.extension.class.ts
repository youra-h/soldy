/**
 * TCollectionExtension — единая точка входа для настройки коллекции.
 *
 * Композиция из трёх шагов:
 *   1. создание коллекции (TCollectionFactoryExtension);
 *   2. применение owner-пропсов (TCollectionPropsExtension);
 *   3. привязка коллекции к реестру bundles + регистрация item-ов через COLLECTION_ELEVATOR.
 *
 * `descriptor` опционален: если он не задан, шаги 1-2 пропускаются
 * (коллекция должна быть создана ранее — например, pass-through через `engine`).
 *
 * Использование:
 *   adapter.use(TCollectionExtension, { descriptor, elevator, engine? })
 */

import type { IAdapterContext } from '../../context'
import type { TElevatorFactory } from '../../elevator'
import { COLLECTION_ELEVATOR } from '../../elevator/keys'
import { TCollectionFactoryExtension } from './collection-factory.extension.class'
import { TCollectionPropsExtension } from './collection-props.extension.class'
import { TCollectionBundlesPlugin } from '@soldy/plugins'
import type { ICollectionDescriptor } from '@soldy/setup'

export interface ICollectionExtensionOptions {
	/** Дескриптор коллекции. Если задан — коллекция создаётся и настраивается. */
	descriptor?: ICollectionDescriptor
	elevator: TElevatorFactory
	/** Готовая коллекция (pass-through из props.engine). */
	engine?: any
}

export class TCollectionExtension {
	constructor(context: IAdapterContext, options: ICollectionExtensionOptions) {
		const { descriptor, elevator, engine } = options

		// 1-2. Создание коллекции и применение owner-пропсов.
		if (descriptor) {
			context.use(TCollectionFactoryExtension, { descriptor, elevator, engine })
			context.use(TCollectionPropsExtension)
		}

		// 3. Привязка коллекции к реестру bundles + регистрация элементов.
		const itemElevator = elevator(COLLECTION_ELEVATOR)

		const collection = context.get(TCollectionFactoryExtension)?.collection
		const bundles = context.bundle?.get(TCollectionBundlesPlugin)

		// Передаём ссылку на коллекцию в плагин — это единственный источник
		// состояния коллекции (активный элемент, порядок, элементы) для плагинов.
		if (bundles && collection) {
			bundles.bindCollection(collection)
		}

		itemElevator.down((instance: any, bundle: any) => {
			// 1. Вставляем элемент в коллекцию (эмитится item:added).
			collection?.extensions?.plain?.insert(instance)

			// 2. Регистрируем bundle элемента (ключ — uid элемента).
			bundles?.register(bundle, instance)

			return () => {
				// Удаление из коллекции эмитит item:removed — реестр bundles
				// очистит запись по этому событию.
				collection?.extensions?.plain?.remove(instance)
			}
		})
	}
}
