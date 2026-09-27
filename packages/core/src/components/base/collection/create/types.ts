import type {
	IExtension,
	TUniqueExtension,
	TMetaExtension,
	TOrderExtension,
	TPlainExtension,
	TBatchExtension,
	TActivationExtension,
	TSelectionExtension,
} from '../engine'

/**
 * Точная карта расширений уровня 1 — то, что есть у любой коллекции без
 * исключений, ставит `baseExtensions()`. `factory` сюда не входит: коллекция
 * ещё не знает класс элемента (см. `baseExtensions` в `./internal.ts`).
 */
export type TBaseCollectionExtensions<TItem extends object> = {
	unique: TUniqueExtension<TItem>
	meta: TMetaExtension<TItem>
	order: TOrderExtension<TItem>
	plain: TPlainExtension<TItem>
	batch: TBatchExtension<TItem>
}

/** Уровень 2: базовый набор плюс активный элемент — модель Tabs. */
export type TActivationCollectionExtensions<TItem extends object> =
	TBaseCollectionExtensions<TItem> & {
		activation: TActivationExtension<TItem>
	}

/** Уровень 2: базовый набор плюс выбор — модель ListBox, Select, Accordion. */
export type TSelectionCollectionExtensions<TItem extends object> =
	TBaseCollectionExtensions<TItem> & {
		selection: TSelectionExtension<TItem>
	}

/**
 * Заявка владельца на движок: кто он и как поставить его расширения.
 *
 * Внутренняя: её ведут `attachEngine` и `releaseEngine` (`./internal.ts`), в
 * `@soldy-ui/core` она не уходит.
 */
export interface IEngineClaim {
	readonly owner: object
	/** Поставить в движок владельческие расширения этого владельца; вернуть поставленные. */
	readonly install: () => IExtension<any>[]
	/**
	 * Сколько фасадов этого владельца держат движок или ждут его. Свой `ctrl`
	 * бывает у двух сборок сразу — новая собрана раньше, чем ушла старая (смена
	 * `key`), — и уход одной не должен отнимать движок у другой.
	 */
	holds: number
}

/** Запись владения движком. Внутренняя, как `IEngineClaim`. */
export interface IEngineTenure {
	/** Чей движок сейчас; `null` — владелец ушёл, а преемника нет. */
	holder: IEngineClaim | null
	/**
	 * Владельческие расширения, поставленные для владельца. После его ухода они
	 * сняты с шин, но стоят в карте движка, пока их место не займёт преемник:
	 * фасад и элементы пересобранного списка читают их раньше, чем он появится.
	 */
	extensions: IExtension<any>[]
	/** Кто ждёт движок: собран, пока движком владел другой, — по порядку сборки. */
	readonly waiting: IEngineClaim[]
}
