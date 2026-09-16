import { TElementPlugin } from '../element'
import { TCollectionBundlesAccess } from './collection-bundles-access.plugin'

/**
 * TCollectionElements — быстрый доступ к DOM-элементам элементов коллекции.
 *
 * Не хранит элементы: извлекает их на лету из bundle каждого item'а через
 * {@link TElementPlugin}. Сами элементы лежат в bundles (реестр
 * {@link TCollectionBundlesPlugin}), инстансы — в engine.
 *
 * Узлы отдаются как `Element` — ровно тем типом, каким их держит
 * {@link TElementPlugin}. Кому нужна HTML-специфика, сужает узел гардом из
 * `utils`; отфильтровать не-HTML узлы здесь нельзя — пропавший элемент
 * коллекции хуже ошибки типа.
 *
 * Зависит от TCollectionBundlesPlugin (регистрируется в том же bundle).
 */
export class TCollectionElements extends TCollectionBundlesAccess {
	/** DOM-элемент элемента коллекции по uid. */
	getElementByUid(uid: string | number): Element | null {
		return this.getBundleByUid(uid)?.get(TElementPlugin)?.element ?? null
	}

	/** DOM-элемент по элементу коллекции. */
	getElementByItem(item: unknown): Element | null {
		return this.getBundleByItem(item)?.get(TElementPlugin)?.element ?? null
	}

	/** DOM-элемент по порядковому индексу в коллекции. */
	getElementByIndex(index: number): Element | null {
		const item = this.getItemByIndex(index)

		return item === undefined ? null : this.getElementByItem(item)
	}

	/** Все DOM-элементы в порядке элементов коллекции. */
	getAll(): Element[] {
		const result: Element[] = []

		for (const bundle of this.getBundleAll()) {
			const element = bundle.get(TElementPlugin)?.element

			if (element) result.push(element)
		}

		return result
	}

	/** Найти uid по DOM-элементу. */
	getUidByElement(element: Element): string | number | undefined {
		if (!this.bundles?.engine) return undefined

		for (const item of this.bundles.engine.extensions.batch.items) {
			if (this.getElementByItem(item) === element) {
				return (item as { uid?: string | number }).uid
			}
		}

		return undefined
	}
}
