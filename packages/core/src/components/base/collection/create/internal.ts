import { TCollectionEngine } from '../engine'
import {
	TPlainExtension,
	TBatchExtension,
	TFactoryExtension,
	TOrderExtension,
	TUniqueExtension,
	TMetaExtension,
	TActivationExtension,
	TSelectionExtension,
} from '../engine'
import type { IExtension, TCollectionEngineItemSource } from '../engine'

/**
 * Внутренняя кухня сборки коллекций — не часть публичного API `@soldy-ui/core`.
 *
 * Наружу (см. `./public.ts`, реэкспортирован через `index.ts`) уходит только
 * готовая сборка: `createEngine`, `createEngineActivation`,
 * `createEngineSelection` и тип их опций. Всё, что здесь, — рабочие
 * инструменты для самих компонентов: состав движка перечисляет
 * `custom/<component>/collection/factory.ts`, а собирает его — пришедший
 * снаружи или новый — `completeEngine`.
 *
 * Границу проводит не модификатор доступа — в TS их для функций модуля нет, —
 * а `index.ts`: он реэкспортирует `./public`, а этот файл нет.
 *
 * Импортируйте отсюда только внутри `core/src`, прямым путём
 * (`base/collection/create/internal`).
 */

/**
 * Детали движка: имя → как построить расширение.
 *
 * Фабрика, а не готовый объект: `completeEngine` создаёт деталь, только если
 * её в движке нет. Порядок ключей — порядок установки: кто ищет соседа в
 * своём `install`, стоит после него. Ключ — имя, под которым расширение
 * встанет в движок (`extension.name`).
 */
export type TExtensionSet<TItem extends object> = Record<string, () => IExtension<TItem>>

/**
 * Опции любого сборщика: состав необязателен, его можно задать и потом.
 *
 * Определён здесь, а не в `public.ts`: `createComponentEngine` — внутренняя
 * функция — тоже принимает эти опции. Наружу тип уходит отдельной строкой
 * в `index.ts`, не утаскивая за собой всё остальное отсюда.
 */
export type TCreateEngineOptions<TItem extends object = object> = {
	items?: readonly (TCollectionEngineItemSource<TItem> | TItem)[]
}

/**
 * Базовые детали — то, что есть у любой коллекции.
 *
 * `factory` входит, только когда известен класс элемента: она оборачивает сырой
 * источник в класс элемента, а какой это класс — знает только компонент. Без
 * неё на первом уровне в коллекции лежат обычные объекты; инстансами их сделает
 * `factory`, которую компонент доставит при сборке, — догонялка у неё для
 * этого и есть. `itemCtor` поэтому передаётся только на компонентном уровне.
 */
export function baseExtensions<TItem extends object>(
	itemCtor?: new (source: Partial<TItem>) => TItem,
): TExtensionSet<TItem> {
	const set: TExtensionSet<TItem> = {
		unique: () => new TUniqueExtension<TItem>(),
		meta: () => new TMetaExtension<TItem>(),
		order: () => new TOrderExtension<TItem>(),
		plain: () => new TPlainExtension<TItem>(),
		batch: () => new TBatchExtension<TItem>(),
	}

	if (itemCtor) set.factory = () => new TFactoryExtension<TItem>({ itemCtor })

	return set
}

/** Базовые детали плюс активный элемент — модель Tabs. */
export function activationExtensions<TItem extends object>(
	itemCtor?: new (source: Partial<TItem>) => TItem,
): TExtensionSet<TItem> {
	return {
		...baseExtensions<TItem>(itemCtor),
		activation: () => new TActivationExtension<TItem>(),
	}
}

/** Базовые детали плюс выбор — модель ListBox, Select и Accordion. */
export function selectionExtensions<TItem extends object>(
	itemCtor?: new (source: Partial<TItem>) => TItem,
): TExtensionSet<TItem> {
	return { ...baseExtensions<TItem>(itemCtor), selection: () => new TSelectionExtension<TItem>() }
}

/**
 * Собрать рабочий движок: поставить недостающие детали.
 *
 * Пришёл движок снаружи, собранный на любом уровне, — доставляется то, чего в
 * нём нет. Не пришёл — берётся новый, и собирается тем же циклом. Деталь,
 * которая уже стоит, не создаётся и не трогается.
 */
export function completeEngine<TItem extends object>(
	engine: TCollectionEngine<TItem, any> | undefined,
	set: TExtensionSet<TItem>,
): TCollectionEngine<TItem, any> {
	const target = engine ?? new TCollectionEngine<TItem, any>({ extensions: {} })

	for (const [name, create] of Object.entries(set)) {
		if (!target.has(name)) target.use(create())
	}

	return target
}

/** Наполнить движок элементами, если их дали. */
export function fillEngine<TItem extends object>(
	engine: TCollectionEngine<TItem, any>,
	items?: readonly (TCollectionEngineItemSource<TItem> | TItem)[],
): TCollectionEngine<TItem, any> {
	const batch: unknown = engine.extensions.batch

	if (items?.length && batch instanceof TBatchExtension) batch.set([...items])

	return engine
}

/**
 * Общее тело компонентных сборщиков (`createEngineTabs` и соседи).
 *
 * Сначала рама с элементами, потом детали владельца — тот же путь, что у
 * движка, собранного снаружи и переданного компоненту. Порядок значим: так
 * значение владельца и отметки из данных сходятся одинаково при любой сборке.
 * Повторный вызов `parts` лишнего не создаёт: детали — фабрики, а стоящие
 * пропускаются по имени.
 *
 * `owner` необязателен: без него деталей владельца в наборе нет.
 */
export function createComponentEngine<TItem extends object, TOwner>(
	parts: (owner?: TOwner) => TExtensionSet<TItem>,
	options: TCreateEngineOptions<TItem> & { owner?: TOwner },
): TCollectionEngine<TItem, any> {
	const frame = fillEngine(completeEngine(undefined, parts()), options.items)

	return completeEngine(frame, parts(options.owner))
}

/** Владелец коллекции — визуальный компонент: у него есть основа `id` в DOM. */
export interface IIdBaseOwner {
	readonly idBase: string
}

/**
 * Основа `id` элементов из данных — от владельца (`TFactoryExtension.bindIdBase`).
 * Элементы из разметки собирает адаптер со своей основой, фабрика их не строит.
 * Элементы, созданные до привязки (движок собран снаружи с `items`), остаются
 * со своей основой — `uid`: такой движок и его `id` — забота того, кто его собрал.
 */
export function withOwnerIds<TItem extends object>(
	engine: TCollectionEngine<TItem, any>,
	owner: IIdBaseOwner | undefined,
): TCollectionEngine<TItem, any> {
	const factory: unknown = engine.extensions.factory

	if (owner && factory instanceof TFactoryExtension) factory.bindIdBase(owner.idBase)

	return engine
}
