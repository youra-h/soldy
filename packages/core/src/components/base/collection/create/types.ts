import type {
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
export type TActivationCollectionExtensions<TItem extends object> = TBaseCollectionExtensions<TItem> & {
	activation: TActivationExtension<TItem>
}

/** Уровень 2: базовый набор плюс выбор — модель ListBox, Select, Accordion. */
export type TSelectionCollectionExtensions<TItem extends object> = TBaseCollectionExtensions<TItem> & {
	selection: TSelectionExtension<TItem>
}
