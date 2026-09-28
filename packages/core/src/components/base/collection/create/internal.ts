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
 * инструменты для самих компонентов: набор расширений компонента объявляет
 * `custom/<component>/collection/factory.ts`, компонентный сборщик —
 * `custom/<component>/collection/create.ts`, а пришедший снаружи движок
 * дособирает `custom/<component>/collection/facade/facade.class.ts`.
 *
 * Границу проводит не модификатор доступа — в TS их для функций модуля нет, —
 * а `index.ts`: он реэкспортирует `./public`, а этот файл нет. Тот же приём
 * уже стоит на `factory.ts` каждого компонента: набор там экспортирован
 * (иначе его не подключить из других файлов пакета), но до потребителя
 * `@soldy-ui/core` не доходит ни через один барабан наверх.
 *
 * Импортируйте отсюда только внутри `core/src`, прямым путём
 * (`base/collection/create/internal`) — так же, как уже делают перечисленные
 * выше файлы.
 */

/**
 * Набор расширений коллекции — как построить каждое. Функция, а не готовый
 * объект: набор переиспользуется. Аргумент — инстанс компонента; расширениям,
 * которым он не нужен (`plain`, `batch`, выбор), его просто не читают.
 *
 * `batch` гарантирован: он есть в любом наборе, который строят
 * `baseExtensions`, `activationExtensions` и `selectionExtensions`, и
 * `assembleEngine` наполняет им движок без приведения типа.
 */
export type TExtensionSet<TItem extends object, TOwner = unknown> = Record<
	string,
	(owner: TOwner) => IExtension<TItem>
> & {
	batch: (owner: TOwner) => TBatchExtension<TItem>
}

/**
 * Опции любого сборщика: состав необязателен, его можно задать и потом.
 *
 * Определён здесь, а не в `public.ts`: `createComponentEngine` — внутренняя
 * функция — тоже принимает эти опции, и владеть формой должен тот файл,
 * который её меньше всего готов потерять. Наружу тип уходит отдельной строкой
 * в `index.ts`, не утаскивая за собой всё остальное отсюда.
 */
export type TCreateEngineOptions<TItem extends object = object> = {
	items?: readonly (TCollectionEngineItemSource<TItem> | TItem)[]
}

/**
 * Базовый набор — то, что есть у любой коллекции.
 *
 * `factory` сюда не входит намеренно: она оборачивает сырой источник в класс
 * элемента, а какой это класс — знает только компонент. Без неё на первом
 * уровне в коллекции лежат обычные объекты; инстансами их сделает `factory`,
 * которую компонент доустановит при дособирании — догонялка у неё для этого и
 * есть. `itemCtor` поэтому передаётся только на компонентном уровне.
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

/** Базовый набор плюс активный элемент — модель Tabs. */
export function activationExtensions<TItem extends object>(
	itemCtor?: new (source: Partial<TItem>) => TItem,
): TExtensionSet<TItem> {
	return {
		...baseExtensions<TItem>(itemCtor),
		activation: () => new TActivationExtension<TItem>(),
	}
}

/** Базовый набор плюс выбор — модель ListBox, Select и Accordion. */
export function selectionExtensions<TItem extends object>(
	itemCtor?: new (source: Partial<TItem>) => TItem,
): TExtensionSet<TItem> {
	return { ...baseExtensions<TItem>(itemCtor), selection: () => new TSelectionExtension<TItem>() }
}

/**
 * Собрать движок по набору и, если дали, наполнить.
 *
 * `batch` строится отдельно от цикла по остальным расширениям: набор
 * гарантирует его типом (`TExtensionSet`), поэтому наполнение движка идёт
 * через готовую ссылку на инстанс, без обращения к `engine.extensions` и без
 * приведения типа.
 */
export function assembleEngine<TItem extends object, TOwner>(
	set: TExtensionSet<TItem, TOwner>,
	owner: TOwner,
	items?: readonly (TCollectionEngineItemSource<TItem> | TItem)[],
): TCollectionEngine<TItem, any> {
	const batch = set.batch(owner)
	const extensions: Record<string, IExtension<TItem>> = { batch }

	for (const [name, build] of Object.entries(set)) {
		if (name === 'batch') continue

		extensions[name] = build(owner)
	}

	const engine = new TCollectionEngine<TItem, any>({ extensions })

	if (items?.length) batch.set([...items])

	return engine
}

/**
 * Движок компонента целиком. Общее тело компонентных сборщиков
 * (`createEngineTabs` и соседи): они отличаются только набором.
 *
 * Тот же путь, что у движка, пришедшего снаружи: коллекция с составом —
 * `createEngine({ items })`, — дособранная набором компонента. Поэтому
 * расширения компонента застают элементы уже в коллекции, как и в готовом
 * движке.
 *
 * `owner` обязателен и проверяется явно: без него расширения, которым нужен
 * компонент, получили бы `undefined` и упали бы позже и не там.
 */
export function createComponentEngine<TItem extends object, TOwner extends IIdBaseOwner>(
	label: string,
	set: TExtensionSet<TItem, TOwner>,
	options: TCreateEngineOptions<TItem> & { owner: TOwner },
): TCollectionEngine<TItem, any> {
	if (!options?.owner) {
		throw new Error(
			`${label}: нужен owner — инстанс компонента, которому принадлежит коллекция`,
		)
	}

	const engine = assembleEngine(baseExtensions<TItem>(), undefined, options.items)

	return completeEngine(engine, set, options.owner)
}

/**
 * Дособрать готовый движок до компонента: поставить расширения набора,
 * которых в нём нет. Что уже есть, остаётся как есть.
 *
 * Пользователь мог собрать движок любым уровнем — компонент дополняет
 * недостающее и не предъявляет требований к тому, кто собирал. Это и делает
 * уровни 1–2 самостоятельными: заранее знать, куда поедет коллекция, не
 * обязательно.
 *
 * **Порядок важен.** В конструкторе движка `extensions` заполняется целиком до
 * первого `install`, поэтому там порядок безразличен. Здесь расширения ставятся
 * по одному, и то, что ищет соседа в своём `install` (`selection` подписывается
 * на `meta`), обязано ставиться после него. Наборы это и задают: `meta` в
 * базовом, `selection` — надстройкой над ним, расширения компонента — в конце.
 */
export function completeEngine<TItem extends object, TOwner extends IIdBaseOwner>(
	engine: TCollectionEngine<TItem, any>,
	set: TExtensionSet<TItem, TOwner>,
	owner: TOwner,
): TCollectionEngine<TItem, any> {
	for (const [name, build] of Object.entries(set)) {
		if (!engine.has(name)) engine.use(build(owner))
	}

	bindItemIdBase(engine, owner)

	return engine
}

/** Владелец коллекции — визуальный компонент: у него есть основа `id` в DOM. */
export interface IIdBaseOwner {
	readonly idBase: string
}

/**
 * Основа `id` элементов из данных — от владельца (`TFactoryExtension.bindIdBase`).
 * Элементы из разметки собирает адаптер со своей основой, фабрика их не строит.
 * Элементы, созданные раньше (движок собран с `items`), остаются со своей
 * основой — `uid`: такой движок и его `id` — забота того, кто его собрал.
 */
function bindItemIdBase(engine: TCollectionEngine<any, any>, owner: IIdBaseOwner): void {
	const factory: unknown = engine.extensions.factory

	if (factory instanceof TFactoryExtension) factory.bindIdBase(owner.idBase)
}
