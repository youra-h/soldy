import type { IExtension, IExtensionContext } from '../types'
import type { TQueryEvent } from '../../types'
import { TBaseExtension } from '../base-extension.class'
import type { TMetaEntry } from '../meta'
import { batchOf, metaOf } from '../neighbours'
import type {
	IGroupExtension,
	TGroup,
	TGroupBy,
	TGroupEvents,
	TGroupKey,
	TGroupSection,
} from './types'

/** Ключ секции элементов без группы. С ключами секций групп (`group:…`) не совпадает. */
const FREE_SECTION = 'free'

/**
 * TGroupExtension — группировка элементов коллекции.
 *
 * **Группировка — выборка, а не перестановка хранилища.** Расширение подписано
 * на `items:query:before`, как `filter` и сортировка таблицы, и выстраивает
 * показанное (`batch.shown`) по группам: группы из `groups` — первыми, в их
 * порядке, остальное — по месту: группа, которой в `groups` нет, собирается к
 * своему первому элементу, а элемент без ключа остаётся там, где стоял.
 * Внутри группы порядок показанного сохраняется. Состав и его порядок
 * (`batch.items`) остаются порядком данных, поэтому навигация, которая ходит
 * по показанному, идёт тем же порядком, что экран, а потребитель не сортирует
 * данные под группы сам.
 *
 * «По месту» — это и порядок разметки. Группа в разметке непрерывна, и её
 * элементы, собранные к первому, стоят там же, где на экране: опция вне
 * группы над группой идёт первой, как у нативного `<select>` с `<optgroup>`.
 *
 * **Ключ элемента** — `groupBy(item)`, если задан, иначе метка `_.group`: её
 * снимок помнит `meta` (`meta.get`), своего хранилища членства нет. Метку
 * элементу из данных дают данные, а элементу разметки — часть группы над ним:
 * проводка адаптера кладёт её ключ в отметки, когда элемент входит в
 * коллекцию. Ключ не строка и не число — элемент без группы.
 *
 * **Подпись группы** — из `groups`, а нет её там — из регистрации
 * (`register`): так подпись даёт группа разметки, чей ключ потребителю не
 * известен. Регистрация отдельна от `groups` — сброс пропа её не стирает — и
 * порядка не задаёт.
 *
 * **Секции** (`sections`) — непрерывные куски итогового показанного с одной
 * группой: разметка рисует их по порядку, и экран сходится с показанным по
 * построению. Элементы без группы между группами — свои куски, с ключами
 * `free`, `free~1` и дальше. Секции считаются заново на `change:shown` соседа
 * `batch`; снимок — тот же массив, пока ничего не сменилось, а
 * `change:sections` — только на смену ключа, группы с подписью или состава
 * секции. Разделитель — не данные: его рисует владелец между соседними
 * секциями.
 *
 * Показанное расширение не хранит — порядок считается на чтение выборки.
 * Поэтому, когда прежний порядок устарел — сменились `groupBy`, порядок групп
 * или метка элемента мимо записи (`meta.apply`), — расширение объявляет
 * выборку недействительной (`invalidateQuery()`): так узнают и память выборки,
 * и читатели. Сменились только подписи — в `groups` или в регистрации, —
 * порядок тот же, и секции пересчитываются без выборки. Правку элемента на
 * месте, мимо команд, которую читает `groupBy`, выборка не видит до следующей
 * записи, как и у `filter`.
 *
 * Подписчики выборки идут по порядку установки, поэтому `group` ставится
 * после отбора и сортировки — переставивший показанное после группировки
 * разорвал бы группы — и до памяти выборки. Ставится там, где разметка
 * рисует секции: элементы, которые стоят флексом по месту в составе
 * (`order`), без разметки секций разошлись бы с показанным.
 */
export class TGroupExtension<TItem extends object = any>
	extends TBaseExtension<TItem, TGroupEvents<TItem>>
	implements IExtension<TItem>, IGroupExtension<TItem>
{
	readonly name = 'group' as const

	private _groupBy: TGroupBy<TItem> | undefined = undefined

	/** Группы в форме записи: свои копии, без повторов ключа */
	private _groups: TGroup[] = []

	/** Зарегистрированные группы по ключу — последняя регистрация ключа */
	private readonly _registered = new Map<TGroupKey, TGroup>()

	private _sections: ReadonlyArray<TGroupSection<TItem>> = []

	private readonly _onQuery = (e: TQueryEvent<TItem>): void => {
		e.items = this._arrange(e.items)
	}

	/**
	 * Метка группы пришла с отметками элемента. Запись сама объявляет показанное
	 * устаревшим, а `meta.apply` записью не является — и память выборки его не
	 * видит: о смене условия сообщает расширение.
	 */
	private readonly _onMeta = (entries: readonly TMetaEntry<TItem>[]): void => {
		if (entries.some(({ meta }) => 'group' in meta)) this._ctx.driver.invalidateQuery()
	}

	override install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

		ctx.driver.events.on('items:query:before', this._onQuery)

		const meta = metaOf(ctx)

		meta?.events.on('meta:applied', this._onMeta)
		meta?.events.on('meta:changed', this._onMeta)

		// Показанное сменилось — состав, отбор или порядок
		batchOf(ctx)?.events.on('change:shown', () => this._update())

		// Догон: расширение приходит и в наполненный движок — собранный снаружи
		// с метками в данных или с `groupBy`, заданным до установки
		const keyOf = this._keyReader()

		if (ctx.driver.valueOf().some((item) => keyOf(item) !== undefined)) {
			ctx.driver.invalidateQuery()
		}

		this._update()
	}

	get groupBy(): TGroupBy<TItem> | undefined {
		return this._groupBy
	}

	set groupBy(value: TGroupBy<TItem> | undefined) {
		if (this._groupBy === value) return

		this._groupBy = value

		this.events.emit('change:groupBy', value)

		this._ctx?.driver.invalidateQuery()
	}

	get groups(): TGroup[] {
		return this._groups.map((group) => ({ ...group }))
	}

	set groups(value: readonly TGroup[] | undefined) {
		const next = normalizeGroups(value ?? [])

		if (sameGroups(next, this._groups)) return

		// Порядок показанного решают ключи групп, подписи — только секции
		const reordered = !sameKeys(next, this._groups)

		this._groups = next

		this.events.emit('change:groups', this.groups)

		if (reordered) this._ctx?.driver.invalidateQuery()
		else this._update()
	}

	get sections(): ReadonlyArray<TGroupSection<TItem>> {
		return this._sections
	}

	/**
	 * Зарегистрировать группу: её подпись получают секции, когда в `groups`
	 * подписи нет. Порядка регистрация не задаёт — выборка прежняя, секции
	 * пересчитываются. Повтор ключа заменяет прежнюю регистрацию: так группа
	 * сообщает новую подпись. Снятие убирает регистрацию, только если она всё
	 * ещё последняя у ключа, — заменённая уже ничего не держит.
	 */
	register(group: TGroup): () => void {
		const entry = copyGroup(group)

		this._registered.set(entry.key, entry)
		this._update()

		return () => {
			if (this._registered.get(entry.key) !== entry) return

			this._registered.delete(entry.key)
			this._update()
		}
	}

	/* ------------------------------------------------------------------ */
	/* Внутреннее                                                         */
	/* ------------------------------------------------------------------ */

	/**
	 * Ключ группы элемента — `groupBy` или метка `_.group` из отметок. Читатель
	 * заводится на проход: соседа `meta` проход ищет один раз.
	 */
	private _keyReader(): (item: TItem) => TGroupKey | undefined {
		const groupBy = this._groupBy
		const meta = metaOf(this._ctx)

		if (groupBy) return (item) => asGroupKey(groupBy(item))

		return (item) => asGroupKey(meta?.get(item)?.group)
	}

	/**
	 * Показанное по группам: группы из `groups` — первыми, в их порядке;
	 * остальное — по месту: незаявленная группа — у своего первого элемента,
	 * элемент без ключа — где стоял. Внутри группы — как пришли. Без единого
	 * ключа — тот же список: порядок не трогается.
	 */
	private _arrange(items: readonly TItem[]): readonly TItem[] {
		const keyOf = this._keyReader()
		const declared = new Set(this._groups.map(({ key }) => key))
		const grouped = new Map<TGroupKey, TItem[]>()
		/** Остальное по месту: элемент без ключа — сам, незаявленная группа — целиком. */
		const placed: TItem[][] = []

		for (const item of items) {
			const key = keyOf(item)

			if (key === undefined) {
				placed.push([item])
				continue
			}

			const group = grouped.get(key)

			if (group) {
				group.push(item)
				continue
			}

			const created = [item]

			grouped.set(key, created)

			if (!declared.has(key)) placed.push(created)
		}

		if (grouped.size === 0) return items

		return [...this._groups.flatMap(({ key }) => grouped.get(key) ?? []), ...placed.flat()]
	}

	/** Секции — заново по показанному. Событие — только на смену. */
	private _update(): void {
		const next = this._sectionsOf(batchOf(this._ctx)?.shown ?? [])

		if (sameSections(next, this._sections)) return

		this._sections = next
		this.events.emit('change:sections', next)
	}

	/**
	 * Непрерывные куски показанного с одним ключом. Ключ секции — от ключа её
	 * группы; повтор получает номер — ключи в снимке уникальны. Повторяются
	 * элементы без группы, разделённые группами, и кусок одной группы,
	 * разорванный тем, кто переставил показанное после группировки.
	 */
	private _sectionsOf(shown: ReadonlyArray<TItem>): TGroupSection<TItem>[] {
		const keyOf = this._keyReader()
		const runs: { key: TGroupKey | undefined; items: TItem[] }[] = []

		for (const item of shown) {
			const key = keyOf(item)
			const last = runs.at(-1)

			if (last && last.key === key) last.items.push(item)
			else runs.push({ key, items: [item] })
		}

		const taken = new Map<string, number>()

		return runs.map(({ key, items }) => {
			const base = key === undefined ? FREE_SECTION : `group:${key}`
			const repeat = taken.get(base) ?? 0

			taken.set(base, repeat + 1)

			return {
				key: repeat === 0 ? base : `${base}~${repeat}`,
				group: key === undefined ? null : this._groupOf(key),
				items,
			}
		})
	}

	/**
	 * Группа по ключу: подпись — из `groups`, а нет её там — из регистрации;
	 * нет нигде — группа без подписи.
	 */
	private _groupOf(key: TGroupKey): TGroup {
		const label =
			this._groups.find((group) => group.key === key)?.label ??
			this._registered.get(key)?.label

		return label === undefined ? { key } : { key, label }
	}
}

/** Ключ группы, если значение им может быть: строка или число. */
function asGroupKey(value: unknown): TGroupKey | undefined {
	return typeof value === 'string' || typeof value === 'number' ? value : undefined
}

/**
 * Своя копия записи группы: объект, который дал потребитель, у расширения не
 * остаётся. Подписи нет — нет и ключа `label`.
 */
function copyGroup({ key, label }: TGroup): TGroup {
	return label === undefined ? { key } : { key, label }
}

/** Группы без повторов ключа: повтор — по первой записи. Записи — свои копии. */
function normalizeGroups(groups: readonly TGroup[]): TGroup[] {
	const keys = new Set<TGroupKey>()
	const normalized: TGroup[] = []

	for (const group of groups) {
		if (keys.has(group.key)) continue

		keys.add(group.key)
		normalized.push(copyGroup(group))
	}

	return normalized
}

/** Те же ключи тем же порядком — порядок показанного тот же. */
function sameKeys(a: readonly TGroup[], b: readonly TGroup[]): boolean {
	return a.length === b.length && a.every((group, index) => group.key === b[index].key)
}

/** Те же группы: те же ключи с теми же подписями тем же порядком. */
function sameGroups(a: readonly TGroup[], b: readonly TGroup[]): boolean {
	return sameKeys(a, b) && a.every((group, index) => group.label === b[index].label)
}

/** Та же группа секции: обе без группы или тот же ключ с той же подписью. */
function sameGroup(a: TGroup | null, b: TGroup | null): boolean {
	if (a === null || b === null) return a === b

	return a.key === b.key && a.label === b.label
}

/** Те же секции: те же ключи и группы с теми же элементами тем же порядком. */
function sameSections<TItem>(
	a: ReadonlyArray<TGroupSection<TItem>>,
	b: ReadonlyArray<TGroupSection<TItem>>,
): boolean {
	return (
		a.length === b.length &&
		a.every((section, index) => {
			const other = b[index]

			return (
				section.key === other.key &&
				sameGroup(section.group, other.group) &&
				section.items.length === other.items.length &&
				section.items.every((item, place) => item === other.items[place])
			)
		})
	)
}
