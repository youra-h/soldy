import { TElementPlugin } from '../element'
import { TCollectionBundlesAccess } from './collection-bundles-access.plugin'

/**
 * TCollectionElements — быстрый доступ к DOM-элементам элементов коллекции.
 *
 * Не хранит элементы: извлекает их на лету из bundle каждого item'а через
 * {@link TElementPlugin}. Сами элементы лежат в bundles (реестр
 * {@link TCollectionBundlesPlugin}), инстансы — в collection.
 *
 * Зависит от TCollectionBundlesPlugin (регистрируется в том же bundle).
 */
export class TCollectionElements extends TCollectionBundlesAccess {
	/** DOM-элемент элемента коллекции по uid. */
	getElementByUid(uid: string | number): HTMLElement | null {
		return this.getBundleByUid(uid)?.get(TElementPlugin)?.element ?? null
	}

	/** DOM-элемент по элементу коллекции. */
	getElementByItem(item: unknown): HTMLElement | null {
		return this.getBundleByItem(item)?.get(TElementPlugin)?.element ?? null
	}

	/** DOM-элемент по порядковому индексу в коллекции. */
	getElementByIndex(index: number): HTMLElement | null {
		const item = this.getItemByIndex(index)

		return item === undefined ? null : this.getElementByItem(item)
	}

	/** Все DOM-элементы в порядке элементов коллекции. */
	getAll(): HTMLElement[] {
		const result: HTMLElement[] = []

		for (const bundle of this.getBundleAll()) {
			const element = bundle.get(TElementPlugin)?.element

			if (element) result.push(element)
		}

		return result
	}

	/** Найти uid по DOM-элементу. */
	getUidByElement(element: HTMLElement): string | number | undefined {
		if (!this.bundles?.collection) return undefined

		for (const item of this.bundles.collection.driver) {
			if (this.getElementByItem(item) === element) {
				return (item as { uid?: string | number }).uid
			}
		}

		return undefined
	}
}
