/**
 * Записи поверхности: проп и событие в именах фреймворка — по ссылке на описание, без его копий.
 */

import type { ISlotDeclaration, TName, TPropSpec } from '../../define'

/** То, по чему строится поверхность: дескриптор компонента или объявление плагина. */
export interface ISurfaceSource {
	getProps(): readonly TPropSpec[]
	getEvents(): readonly TName[]
	readonly slots?: readonly ISlotDeclaration[]
}

export interface ISurfaceProp {
	/** Описание свойства: тип, `protected`, триггеры и умолчание читаются у него, копий здесь нет. */
	readonly spec: TPropSpec
	/** Имя пропа во фреймворке: `text`, `aria_label`. */
	readonly exportName: string
	/** Событие двусторонней привязки (`update:text`) — у записываемого пропа с триггерами, если привязку знает профиль. */
	readonly model?: string
}

export interface ISurfaceEvent {
	/** Имя у владельца: `name.name` — на что подписываться, `name.namespace` — у кого. */
	readonly name: TName
	/** Имя события во фреймворке: `change:text`, `onChangeText`, `changeText`. */
	readonly exportName: string
	/** Пропсы с привязкой, для которых это событие — триггер: их `update:<проп>` уходит следом. */
	readonly models: readonly ISurfaceProp[]
}

/** Объявление пропа для статического слоя: ключ `default` есть, только если умолчание объявлено. */
export type TSurfacePropConfig = { type?: unknown; default?: unknown }
