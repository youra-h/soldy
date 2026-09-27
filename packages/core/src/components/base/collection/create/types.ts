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
 * Фасад, через который владелец держит движок. Его снимают (`destroy`), когда
 * движок достаётся другому владельцу или другому фасаду того же владельца.
 *
 * Внутренний, как и запись владения: их ведут `attachEngine`, `retainEngine`
 * и `releaseEngine` (`./internal.ts`), в `@soldy-ui/core` они не уходят.
 */
export interface IEngineHolder {
	destroy(): void
}

/** Запись владения движком. */
export interface IEngineClaim {
	/** Владелец, для которого стоят расширения. */
	readonly owner: object
	/** Владельческие расширения, поставленные для него: их снимет следующий владелец. */
	readonly extensions: IExtension<any>[]
	/**
	 * Фасад, чьё монтирование кончилось (`releaseEngine`), пока движок не
	 * удержали снова (`retainEngine`). Есть — движок свободен, и другой
	 * владелец его возьмёт.
	 */
	released?: IEngineHolder
}
