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
import type { IEngineClaim, IEngineTenure } from './types'

/**
 * Внутренняя кухня сборки коллекций — не часть публичного API `@soldy-ui/core`.
 *
 * Наружу (см. `./public.ts`, реэкспортирован через `index.ts`) уходит только
 * готовая сборка: `createEngine`, `createEngineActivation`,
 * `createEngineSelection` и тип их опций. Всё, что здесь, — рабочие
 * инструменты для самих компонентов: набор расширений строит
 * `custom/<component>/collection/factory.ts`, компонентный сборщик —
 * `custom/<component>/collection/create.ts`, а пришедший снаружи движок
 * достраивает `custom/<component>/collection/facade/facade.class.ts`.
 *
 * Границу проводит не модификатор доступа — в TS их для функций модуля нет, —
 * а `index.ts`: он реэкспортирует `./public`, а этот файл нет. Тот же приём
 * уже стоит на `factory.ts` каждого компонента: `TabsFactory` и соседи там
 * экспортированы (иначе их не подключить из других файлов пакета), но до
 * потребителя `@soldy-ui/core` не доходят ни через один барабан наверх.
 *
 * Импортируйте отсюда только внутри `core/src`, прямым путём
 * (`base/collection/create/internal`) — так же, как уже делают перечисленные
 * выше файлы.
 */

/** Как построить расширение. Функция, а не готовый объект: набор переиспользуется. */
export type TExtensionSet<TItem extends object> = Record<string, () => IExtension<TItem>>

/**
 * То же, но с гарантией `batch`: он есть в любом наборе, который строят
 * `baseExtensions`, `activationExtensions` и `selectionExtensions`.
 * `assembleEngine` полагается на эту гарантию, чтобы наполнить движок без
 * приведения типа.
 */
export type TBaseExtensionSet<TItem extends object> = TExtensionSet<TItem> & {
	batch: () => TBatchExtension<TItem>
}

/** То же для расширений, которым нужен инстанс компонента. */
export type TOwnerExtensionSet<TItem extends object, TOwner> = Record<
	string,
	(owner: TOwner) => IExtension<TItem>
>

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
 * которую компонент доустановит при привязке — догонялка у неё для этого и
 * есть. `itemCtor` поэтому передаётся только на компонентном уровне.
 */
export function baseExtensions<TItem extends object>(
	itemCtor?: new (source: Partial<TItem>) => TItem,
): TBaseExtensionSet<TItem> {
	const set: TBaseExtensionSet<TItem> = {
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
): TBaseExtensionSet<TItem> {
	return {
		...baseExtensions<TItem>(itemCtor),
		activation: () => new TActivationExtension<TItem>(),
	}
}

/** Базовый набор плюс выбор — модель ListBox, Select и Accordion. */
export function selectionExtensions<TItem extends object>(
	itemCtor?: new (source: Partial<TItem>) => TItem,
): TBaseExtensionSet<TItem> {
	return { ...baseExtensions<TItem>(itemCtor), selection: () => new TSelectionExtension<TItem>() }
}

/**
 * Собрать движок по набору и, если дали, наполнить.
 *
 * `batch` строится отдельно от цикла по остальным расширениям: набор
 * гарантирует его типом (`TBaseExtensionSet`), поэтому наполнение движка идёт
 * через готовую ссылку на инстанс, без обращения к `engine.extensions` и без
 * приведения типа.
 */
export function assembleEngine<TItem extends object>(
	set: TBaseExtensionSet<TItem>,
	items?: readonly (TCollectionEngineItemSource<TItem> | TItem)[],
): TCollectionEngine<TItem, any> {
	const batch = set.batch()
	const extensions: Record<string, IExtension<TItem>> = { batch }

	for (const [name, build] of Object.entries(set)) {
		if (name === 'batch') continue

		extensions[name] = build()
	}

	const engine = new TCollectionEngine<TItem, any>({ extensions })

	if (items?.length) batch.set([...items])

	return engine
}

/**
 * Общее тело компонентных сборщиков.
 *
 * Все четыре (`createEngineTabs` и соседи) отличаются только наборами, поэтому
 * само тело написано один раз: четыре копии одного кода в этом проекте уже
 * однажды разъехались — тремя разными API у фасадов.
 *
 * `owner` обязателен и проверяется явно: без него владельческие расширения
 * получили бы `undefined` и упали бы позже и не там.
 */
export function createComponentEngine<TItem extends object, TOwner>(
	label: string,
	set: TBaseExtensionSet<TItem>,
	ownerSet: TOwnerExtensionSet<TItem, TOwner>,
	options: TCreateEngineOptions<TItem> & { owner: TOwner },
) {
	if (!options?.owner) {
		throw new Error(
			`${label}: нужен owner — инстанс компонента, которому принадлежит коллекция`,
		)
	}

	const engine = assembleEngine<TItem>(set, options.items)

	for (const build of Object.values(ownerSet)) engine.use(build(options.owner))

	return engine
}

/**
 * Кому движок принадлежит, какие расширения стоят для владельца и кто ждёт.
 *
 * Запись на самом движке, а не геттер `owner` в классах расширений: так
 * владение живёт в одном месте и не требует ничего от того, кто пишет новое
 * расширение. `WeakMap` — чтобы не удерживать выброшенные движки.
 *
 * Движок, пришедший снаружи, переживает владельца: React пересобирает список
 * под StrictMode и `<Activity>`, Vue монтирует его заново под `v-if`, и без
 * `ctrl` у каждой сборки новый владелец. Поэтому владение не вечное: фасад,
 * уходя, отпускает движок (`releaseEngine`), и следующий владелец ставит свои
 * расширения на место расширений прежнего.
 */
const ENGINE_TENURES = new WeakMap<object, IEngineTenure>()

/** Запись владения движком; у движка без неё — ни владельца, ни очереди. */
function tenureOf(engine: object): IEngineTenure {
	const present = ENGINE_TENURES.get(engine)

	if (present) return present

	const tenure: IEngineTenure = { holder: null, extensions: [], waiting: [] }

	ENGINE_TENURES.set(engine, tenure)

	return tenure
}

/** Заявка владельца, если он уже держит движок или ждёт его. */
function claimOf(tenure: IEngineTenure, owner: object): IEngineClaim | undefined {
	if (tenure.holder?.owner === owner) return tenure.holder

	return tenure.waiting.find((claim) => claim.owner === owner)
}

/**
 * Поставить владельческие расширения, которых в движке нет, и вернуть
 * поставленные: снимет их уход владельца. Недостающее — по имени, как у
 * базового набора: у движка, собранного сборщиком компонента
 * (`createEngineListBox` и соседи), владельческие уже стоят и остаются за тем,
 * для кого их собрали.
 */
function installOwnerExtensions<TItem extends object, TOwner extends IIdBaseOwner>(
	engine: TCollectionEngine<TItem, any>,
	ownerSet: TOwnerExtensionSet<TItem, TOwner>,
	owner: TOwner,
): IExtension<TItem>[] {
	const installed: IExtension<TItem>[] = []

	for (const [name, build] of Object.entries(ownerSet)) {
		if (engine.extensions[name]) continue

		const extension = build(owner)

		engine.use(extension)
		installed.push(extension)
	}

	bindItemIdBase(engine, owner)

	return installed
}

/**
 * Отдать движок заявке: расширения прежнего владельца уходят из карты движка
 * (с шин они сняты ещё его уходом), на их место встают расширения нового.
 */
function hand(
	engine: TCollectionEngine<any, any>,
	tenure: IEngineTenure,
	claim: IEngineClaim,
): void {
	for (const extension of tenure.extensions) engine.remove(extension)

	tenure.holder = claim
	tenure.extensions = claim.install()
}

/**
 * Привязать пришедший снаружи движок к компоненту.
 *
 * Пользователь мог собрать его любым уровнем — компонент дополняет недостающее
 * и не предъявляет требований к тому, кто собирал. Это и делает уровни 1–2
 * самостоятельными: заранее знать, куда поедет коллекция, не обязательно.
 *
 * Базовый набор ставится сразу и остаётся с движком. Владельческий — когда
 * движок свободен: владельца у него не было или прежний ушёл
 * (`releaseEngine`), и тогда расширения прежнего уходят, а на их место встают
 * расширения этого. Занят другим — владелец ждёт в очереди. Тот же владелец,
 * собранный ещё раз, движок уже держит.
 *
 * **Порядок важен.** В конструкторе движка `extensions` заполняется целиком до
 * первого `install`, поэтому там порядок безразличен. Здесь расширения ставятся
 * по одному, и то, что ищет соседа в своём `install` (`selection` подписывается
 * на `meta`), обязано ставиться после него. Наборы это и задают: `meta` в
 * базовом, `selection` — надстройкой над ним.
 */
export function attachEngine<TItem extends object, TOwner extends IIdBaseOwner>(
	engine: TCollectionEngine<TItem, any>,
	set: TExtensionSet<TItem>,
	ownerSet: TOwnerExtensionSet<TItem, TOwner>,
	owner: TOwner,
	label: string,
): void {
	for (const [name, build] of Object.entries(set)) {
		if (engine.extensions[name]) continue

		engine.use(build())
	}

	const tenure = tenureOf(engine)
	const present = claimOf(tenure, owner)

	if (present) {
		present.holds += 1

		return
	}

	const claim: IEngineClaim = {
		owner,
		install: () => installOwnerExtensions(engine, ownerSet, owner),
		holds: 1,
	}

	if (tenure.holder) {
		// Два владельца сразу не поддерживаются: расширения лежат по имени, и
		// второй молча затёр бы владельческое расширение первого — тот перестал
		// бы раздавать элементам `size`, `variant` и `disabled`, ничем об этом
		// не сообщив. Первый остаётся рабочим, второй ждёт: движок перейдёт к
		// нему, когда первый уйдёт. Так бывает и без ошибки — новый список
		// собран раньше, чем ушёл прежний (смена `key`), — но в момент сборки
		// это от двух владельцев не отличить
		console.warn(
			`${label}: движок уже привязан к другому компоненту. ` +
				`Один движок — один компонент; второму нужна своя коллекция.`,
		)

		tenure.waiting.push(claim)

		return
	}

	hand(engine, tenure, claim)
}

/**
 * Владелец отпускает движок — фасад, который его взял, уходит.
 *
 * - Держит движок: его расширения снимаются с шин (`destroy`) — движка,
 *   соседних расширений, самого владельца и элементов, — а движок переходит к
 *   первому ждущему. Ждущих нет — расширения ушедшего остаются в карте
 *   движка, пока их место не займёт следующий владелец: фасад и элементы
 *   пересобранного списка читают их раньше, чем он появится (React собирает
 *   элементы заново раньше списка).
 * - Ждёт движок: уходит из очереди.
 * - Иначе ничего: движком владеет другой или его никто не брал.
 *
 * Один и тот же владелец (свой `ctrl`) держит движок, пока не ушёл последний
 * из собранных для него фасадов.
 */
export function releaseEngine(engine: TCollectionEngine<any, any>, owner: object): void {
	const tenure = ENGINE_TENURES.get(engine)
	const claim = tenure ? claimOf(tenure, owner) : undefined

	if (!tenure || !claim) return

	claim.holds -= 1

	if (claim.holds > 0) return

	if (claim !== tenure.holder) {
		tenure.waiting.splice(tenure.waiting.indexOf(claim), 1)

		return
	}

	for (const extension of tenure.extensions) extension.destroy?.()

	tenure.holder = null

	const next = tenure.waiting.shift()

	if (next) hand(engine, tenure, next)
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
function bindItemIdBase(engine: TCollectionEngine<any, any>, owner: IIdBaseOwner): void {
	const factory: unknown = engine.extensions.factory

	if (factory instanceof TFactoryExtension) factory.bindIdBase(owner.idBase)
}

/**
 * Свой движок фасада: владельческие расширения поставила фабрика владельца.
 * Записать их за владельцем, как `attachEngine` записывает поставленные в
 * чужой: они подписаны на шину владельца, а свой `ctrl` приложения переживает
 * монтирование — не снятые уходом владельца, они копили бы на ней
 * обработчики мёртвых движков. Расширения — те, что стоят под именами
 * владельческого набора: фабрика строит движок по нему же.
 */
function claimBuilt<TItem extends object, TOwner extends IIdBaseOwner>(
	engine: TCollectionEngine<TItem, any>,
	ownerSet: TOwnerExtensionSet<TItem, TOwner>,
	owner: TOwner,
): void {
	const tenure = tenureOf(engine)

	tenure.holder = {
		owner,
		install: () => installOwnerExtensions(engine, ownerSet, owner),
		holds: 1,
	}
	tenure.extensions = Object.keys(ownerSet).flatMap((name) => {
		const extension = engine.extensions[name]

		return extension ? [extension] : []
	})

	bindItemIdBase(engine, owner)
}

/**
 * Движок для фасада: чужой — дополнить, своего нет — построить. В обоих
 * случаях движок записан за владельцем, и фасад, уходя, его отпускает
 * (`releaseEngine`).
 *
 * Зовётся **в выражении аргумента `super()`**, и это не стилистика. Базовые
 * фасады трогают расширения в собственных конструкторах
 * (`TSelectionCollectionFacade` релеит `extensions.selection.events`), а
 * выполняются они раньше тела наследника. Дополни движок после `super()` — и
 * список уровня 1 упадёт на `undefined` ещё до того, как до дополнения дойдёт
 * очередь.
 */
export function resolveEngine<TItem extends object, TOwner extends IIdBaseOwner>(
	options: { engine?: unknown; owner?: TOwner },
	set: TExtensionSet<TItem>,
	ownerSet: TOwnerExtensionSet<TItem, TOwner>,
	label: string,
	build: (owner: TOwner) => TCollectionEngine<TItem, any>,
): TCollectionEngine<TItem, any> {
	if (!options.engine) {
		const built = build(options.owner as TOwner)

		if (options.owner) claimBuilt(built, ownerSet, options.owner)

		return built
	}

	const engine = options.engine as TCollectionEngine<TItem, any>

	if (options.owner) attachEngine(engine, set, ownerSet, options.owner, label)

	return engine
}
