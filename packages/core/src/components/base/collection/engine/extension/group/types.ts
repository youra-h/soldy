import type { IExtension } from '../types'

/**
 * Ключ группы — строка или число, как `value` элемента. Сверяется строго
 * (`===`): `1` и `'1'` — разные группы.
 */
export type TGroupKey = string | number

/**
 * Группа — ключ и подпись. Подпись — свойство группы, а не элемента: её не
 * повторяют в каждом элементе. Без подписи группа остаётся группой, только
 * без имени.
 */
export type TGroup = {
	readonly key: TGroupKey
	readonly label?: string
}

/**
 * Ключ группы элемента. Откуда его брать — поле, вычисление, — решает
 * приложение, как с `trackBy`. `undefined` — элемент без группы.
 */
export type TGroupBy<TItem> = (item: TItem) => TGroupKey | undefined

/**
 * Секция — непрерывный кусок показанного (`batch.shown`) с одной группой.
 * Разметка рисует секции по порядку, и экран идёт тем же порядком, что
 * навигация по показанному.
 *
 * `key` — ключ секции, уникальный в снимке: ключ петли разметки. Это не ключ
 * группы — у элементов без группы его нет.
 */
export type TGroupSection<TItem> = {
	readonly key: string
	/** Группа секции; `null` — элементы без группы */
	readonly group: TGroup | null
	readonly items: ReadonlyArray<TItem>
}

export type TGroupEvents<TItem> = {
	/** change:groupBy */
	'change:groupBy': (value: TGroupBy<TItem> | undefined) => void
	/** Сменились группы — состав, порядок или подписи */
	'change:groups': (value: TGroup[]) => void
	/** Сменились секции — ключ, группа с подписью или состав секции */
	'change:sections': (value: ReadonlyArray<TGroupSection<TItem>>) => void
}

/**
 * Owner-level props коллекции от расширения `group` (input). Зеркало пропсов
 * дескриптора коллекции (setup) у компонента, который группирует.
 */
export interface IGroupCollectionProps<TItem = any> {
	/** Ключ группы элемента. Не задан — метка `_.group` из данных */
	groupBy?: TGroupBy<TItem>
	/** Порядок групп и их подписи */
	groups?: TGroup[]
}

/**
 * Контракт расширения группировки: порядок показанного по группам и секции
 * показанного для разметки.
 */
export interface IGroupExtension<TItem extends object = any> extends IExtension<
	TItem,
	TGroupEvents<TItem>
> {
	/** Ключ группы элемента. Не задан — метка `_.group` из данных */
	groupBy: TGroupBy<TItem> | undefined

	/** Группы по порядку, с подписями. Копия: правка снаружи состояния не меняет */
	get groups(): TGroup[]
	/**
	 * Записать группы. Сверка — по содержимому: те же ключи с теми же подписями
	 * тем же порядком — не смена. Повтор ключа — по первой записи; не заданы —
	 * групп нет
	 */
	set groups(value: readonly TGroup[] | undefined)

	/**
	 * Секции показанного по порядку: непрерывные куски с одной группой. Снимок —
	 * тот же массив, пока секции не сменились
	 */
	readonly sections: ReadonlyArray<TGroupSection<TItem>>
}
