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
 * показанное (`batch.shown`) по группам: группы — в порядке `groups`; ключ,
 * которого в `groups` нет, — следом, по первому элементу, группой без
 * подписи; элементы без ключа — в конце. Внутри группы порядок показанного
 * сохраняется. Состав и его порядок (`batch.items`) остаются порядком данных,
 * поэтому навигация, которая ходит по показанному, идёт тем же порядком, что
 * экран, а потребитель не сортирует данные под группы сам.
 *
 * **Ключ элемента** — `groupBy(item)`, если задан, иначе метка `_.group` из
 * данных: её снимок помнит `meta` (`meta.get`), своего хранилища членства
 * нет. Ключ не строка и не число — элемент без группы.
 *
 * **Секции** (`sections`) — непрерывные куски итогового показанного с одной
 * группой: разметка рисует их по порядку, и экран сходится с показанным по
 * построению. Секции считаются заново на `change:shown` соседа `batch`;
 * снимок — тот же массив, пока ничего не сменилось, а `change:sections` — только
 * на смену ключа, группы с подписью или состава секции. Разделитель — не
 * данные: его рисует владелец между соседними секциями.
 *
 * Показанное расширение не хранит — порядок считается на чтение выборки.
 * Поэтому, когда прежний порядок устарел — сменились `groupBy`, порядок групп
 * или метка элемента мимо записи (`meta.apply`), — расширение объявляет
 * выборку недействительной (`invalidateQuery()`): так узнают и память выборки,
 * и читатели. Сменились только подписи — порядок тот же, и секции
 * пересчитываются без выборки. Правку элемента на месте, мимо команд, которую
 * читает `groupBy`, выборка не видит до следующей записи, как и у `filter`.
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

	/* ------------------------------------------------------------------ */
	/* Внутреннее                                                         */
	/* ------------------------------------------------------------------ */

	/**
	 * Ключ группы элемента — `groupBy` или метка `_.group` из данных. Читатель
	 * заводится на проход: соседа `meta` проход ищет один раз.
	 */
	private _keyReader(): (item: TItem) => TGroupKey | undefined {
		const groupBy = this._groupBy
		const meta = metaOf(this._ctx)

		if (groupBy) return (item) => asGroupKey(groupBy(item))

		return (item) => asGroupKey(meta?.get(item)?.group)
	}

	/**
	 * Показанное по группам: группы в порядке `groups`, незаявленные — следом
	 * по первому элементу, без ключа — в конце; внутри группы — как пришли.
	 * Без единого ключа — тот же список: порядок не трогается.
	 */
	private _arrange(items: readonly TItem[]): readonly TItem[] {
		const keyOf = this._keyReader()
		const grouped = new Map<TGroupKey, TItem[]>()
		const free: TItem[] = []

		for (const item of items) {
			const key = keyOf(item)

			if (key === undefined) {
				free.push(item)
				continue
			}

			const group = grouped.get(key)

			if (group) group.push(item)
			else grouped.set(key, [item])
		}

		if (grouped.size === 0) return items

		const declared = this._groups.map(({ key }) => key)
		const known = new Set(declared)
		const order = [
			...declared.filter((key) => grouped.has(key)),
			...[...grouped.keys()].filter((key) => !known.has(key)),
		]

		return [...order.flatMap((key) => grouped.get(key) ?? []), ...free]
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
	 * группы; повтор (кусок одной группы разорван тем, кто переставил
	 * показанное после группировки) получает номер — ключи в снимке уникальны.
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

	/** Группа по ключу: заявленная — с подписью, незаявленная — без неё. */
	private _groupOf(key: TGroupKey): TGroup {
		const declared = this._groups.find((group) => group.key === key)

		return declared ? { ...declared } : { key }
	}
}

/** Ключ группы, если значение им может быть: строка или число. */
function asGroupKey(value: unknown): TGroupKey | undefined {
	return typeof value === 'string' || typeof value === 'number' ? value : undefined
}

/**
 * Группы без повторов ключа: повтор — по первой записи. Записи — свои копии:
 * список и объекты, которые дал потребитель, у расширения не остаются.
 */
function normalizeGroups(groups: readonly TGroup[]): TGroup[] {
	const keys = new Set<TGroupKey>()
	const normalized: TGroup[] = []

	for (const { key, label } of groups) {
		if (keys.has(key)) continue

		keys.add(key)
		normalized.push(label === undefined ? { key } : { key, label })
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
