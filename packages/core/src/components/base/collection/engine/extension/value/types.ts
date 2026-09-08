import type { TEvented } from '../../../../../../common'

/** Значение выбора: скаляр в `single`, массив в `multiple`, `undefined` — пусто. */
export type TSelectionValue = string | number | (string | number)[] | undefined

/**
 * Что расширению нужно от владельца.
 *
 * Минимальный контракт вместо `IValueControl`: расширению безразличны
 * `disabled`, `size` и прочее — ему нужны значение и возможность узнать о его
 * смене. Узкий тип позволяет подключить его и к Select, который растёт от
 * `TInputControl`, и к List, который от `TValueControl`.
 */
export interface IValueSelectionOwner {
	value: TSelectionValue
	readonly events: TEvented<any>
}

/** Элемент, у которого есть значение — по нему и ищется соответствие. */
export interface IValuedItem {
	readonly value: string | number | undefined
}

export type TValueSelectionExtensionOptions<TOwner extends IValueSelectionOwner> = {
	owner: TOwner
}

export type TValueSelectionExtensionEvents = {
	destroy: () => void
}
