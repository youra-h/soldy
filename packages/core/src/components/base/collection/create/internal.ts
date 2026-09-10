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
import type { IExtension } from '../engine'

/**
 * Внутренняя кухня сборки коллекций — не часть публичного API `@soldy/core`.
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
 * потребителя `@soldy/core` не доходят ни через один барабан наверх.
 *
 * Импортируйте отсюда только внутри `core/src`, прямым путём
 * (`base/collection/create/internal`) — так же, как уже делают перечисленные
 * выше файлы.
 */

/** Как построить расширение. Функция, а не готовый объект: набор переиспользуется. */
export type TExtensionSet<TItem extends object> = Record<string, () => IExtension<TItem>>

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
export type TCreateEngineOptions = {
	items?: readonly any[]
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
	itemCtor?: new (source: any) => TItem,
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
	itemCtor?: new (source: any) => TItem,
): TExtensionSet<TItem> {
	return { ...baseExtensions<TItem>(itemCtor), activation: () => new TActivationExtension<TItem>() }
}

/** Базовый набор плюс выбор — модель ListBox, Select и Accordion. */
export function selectionExtensions<TItem extends object>(
	itemCtor?: new (source: any) => TItem,
): TExtensionSet<TItem> {
	return { ...baseExtensions<TItem>(itemCtor), selection: () => new TSelectionExtension<TItem>() }
}

/** Собрать движок по набору и, если дали, наполнить. */
export function assembleEngine<TItem extends object, TExtensions extends Record<string, any>>(
	set: TExtensionSet<TItem>,
	items?: readonly any[],
): TCollectionEngine<TItem, TExtensions> {
	const extensions: Record<string, IExtension<TItem>> = {}

	for (const [name, build] of Object.entries(set)) extensions[name] = build()

	const engine = new TCollectionEngine<TItem, TExtensions>({
		extensions: extensions as TExtensions,
	})

	if (items?.length) {
		;(engine.extensions as any).batch?.set([...items])
	}

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
	set: TExtensionSet<TItem>,
	ownerSet: TOwnerExtensionSet<TItem, TOwner>,
	options: TCreateEngineOptions & { owner: TOwner },
) {
	if (!options?.owner) {
		throw new Error(`${label}: нужен owner — инстанс компонента, которому принадлежит коллекция`)
	}

	const engine = assembleEngine<TItem, any>(set, options.items)

	for (const build of Object.values(ownerSet)) engine.use(build(options.owner))

	return engine
}

/**
 * Кому движок уже принадлежит.
 *
 * Метка на самом движке, а не геттер `owner` в пяти классах расширений: так
 * проверка живёт в одном месте и не требует ничего от того, кто пишет новое
 * расширение. `WeakMap` — чтобы не удерживать выброшенные движки.
 */
const ENGINE_OWNERS = new WeakMap<object, unknown>()

/**
 * Привязать пришедший снаружи движок к компоненту.
 *
 * Пользователь мог собрать его любым уровнем — компонент дополняет недостающее
 * и не предъявляет требований к тому, кто собирал. Это и делает уровни 1–2
 * самостоятельными: заранее знать, куда поедет коллекция, не обязательно.
 *
 * **Порядок важен.** В конструкторе движка `extensions` заполняется целиком до
 * первого `install`, поэтому там порядок безразличен. Здесь расширения ставятся
 * по одному, и то, что ищет соседа в своём `install` (`selection` подписывается
 * на `meta`), обязано ставиться после него. Наборы это и задают: `meta` в
 * базовом, `selection` — надстройкой над ним.
 */
export function attachEngine<TItem extends object, TOwner>(
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

	const previous = ENGINE_OWNERS.get(engine)

	if (previous && previous !== owner) {
		// Не падаем и не поддерживаем двух владельцев: расширения лежат по
		// имени, и второй молча затёр бы владельческое расширение первого —
		// тот перестал бы раздавать элементам `size`, `variant` и `disabled`,
		// ничем об этом не сообщив. Первый остаётся рабочим, второй — нет
		console.warn(
			`${label}: движок уже привязан к другому компоненту. ` +
				`Один движок — один компонент; второму нужна своя коллекция.`,
		)

		return
	}

	ENGINE_OWNERS.set(engine, owner)

	for (const [name, build] of Object.entries(ownerSet)) {
		if (engine.extensions[name]) continue

		engine.use(build(owner))
	}
}

/**
 * Движок для фасада: чужой — дополнить, своего нет — построить.
 *
 * Зовётся **в выражении аргумента `super()`**, и это не стилистика. Базовые
 * фасады трогают расширения в собственных конструкторах
 * (`TSelectionCollectionFacade` релеит `extensions.selection.events`), а
 * выполняются они раньше тела наследника. Дополни движок после `super()` — и
 * список уровня 1 упадёт на `undefined` ещё до того, как до дополнения дойдёт
 * очередь.
 */
export function resolveEngine<TItem extends object, TOwner>(
	options: { engine?: unknown; owner?: TOwner },
	set: TExtensionSet<TItem>,
	ownerSet: TOwnerExtensionSet<TItem, TOwner>,
	label: string,
	build: (owner: TOwner) => TCollectionEngine<TItem, any>,
): TCollectionEngine<TItem, any> {
	if (!options.engine) return build(options.owner as TOwner)

	const engine = options.engine as TCollectionEngine<TItem, any>

	if (options.owner) attachEngine(engine, set, ownerSet, options.owner, label)

	return engine
}
