import { batchOf } from '@soldy-ui/core'
import type { IComponentView } from '@soldy-ui/core'
import type { IPluginBundle } from '../../base'
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
 * Узла, которого ещё нет в документе, ждут здесь же — {@link waitFor}.
 *
 * Зависит от TCollectionBundlesPlugin (регистрируется в том же bundle).
 */
export class TCollectionElements extends TCollectionBundlesAccess {
	/**
	 * Ждать узел элемента коллекции, которого в документе ещё нет: модель уже
	 * сменилась — новый месяц календаря, новый таб, — а разметка его ещё не
	 * нарисовала.
	 *
	 * Узел приходит в два шага: элемент входит в коллекцию — его набор
	 * регистрируется в реестре (`bundle:registered`), — и узел объявляет его
	 * `TElementPlugin` (`ready`, кадром позже привязки). Порядок шагов решает
	 * адаптер: обычно регистрация идёт раньше привязки узла, но бывает и после
	 * принятия компонента, когда узел уже привязан и его `ready` пришло раньше
	 * регистрации. Поэтому проверка зовётся на каждой регистрации сразу и ещё
	 * раз — на `ready` узла этого элемента.
	 *
	 * Какой узел нужен, помощник не знает: это решает проверка, и цель она
	 * ищет заново на каждый вызов — у модели, а не запомненную заранее. `true`
	 * — дождались: помощник снимает свои подписки. Подписки — прямые: шина
	 * реестра живёт в том же наборе, а шина узла умирает вместе с набором
	 * элемента. Первую попытку, до ожидания, делает тот, кто ждёт: помощник
	 * проверку сам не зовёт.
	 *
	 * @param check проверка: нашёлся ли узел и сделано ли с ним то, ради чего
	 * его ждали. `true` — ожидание кончено.
	 * @returns снять ожидание; повторный вызов и вызов после `true` ничего не
	 * делают.
	 */
	waitFor(check: () => boolean): () => void {
		const bundles = this.bundles
		const unsubscribes: (() => void)[] = []
		let waiting = true

		const stop = (): void => {
			if (!waiting) return

			waiting = false

			for (const unsubscribe of unsubscribes.splice(0)) unsubscribe()
		}

		const test = (): void => {
			if (waiting && check()) stop()
		}

		const onRegistered = ({ bundle }: { bundle: IPluginBundle }): void => {
			test()

			const element = bundle.get(TElementPlugin)

			if (!waiting || !element) return

			element.events.on('ready', test)
			unsubscribes.push(() => element.events.off('ready', test))
		}

		if (bundles) {
			bundles.events.on('bundle:registered', onRegistered)
			unsubscribes.push(() => bundles.events.off('bundle:registered', onRegistered))
		}

		return stop
	}

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
		for (const item of batchOf<IComponentView>(this.bundles?.engine)?.items ?? []) {
			if (this.getElementByItem(item) === element) {
				return item.uid
			}
		}

		return undefined
	}
}
