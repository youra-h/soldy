/**
 * Framework profile: what the adapter tells the shared layer about its framework — the names and how it applies writes.
 *
 * The core and the descriptor speak one language (`text`, `aria:label`,
 * `change:text`), every framework speaks its own. Everything the frameworks
 * differ in for the shared layer — the names, the default slot, the binding
 * event, how a group of writes is applied — is one constant of the adapter;
 * its identity is the surface's cache key.
 */

import type { TName } from '../define/name.class'

/** Правила имён пропсов и событий во фреймворке. */
export interface INamingStrategy {
	/** Имя пропа: одно во всех фреймворках — `text`, `aria_label` (`underscorePropNaming`). */
	prop(name: TName): string
	/** Имя события: `change:text` у Vue, `onChangeText` у React, `soChangeText` у Angular. */
	event(name: TName): string
}

export interface IAdapterProfile {
	readonly naming: INamingStrategy
	/** Как фреймворк называет слот по умолчанию (`children`); не задано — имя не переводится. */
	readonly defaultSlot?: string
	/**
	 * Событие двусторонней привязки по имени пропа во фреймворке (`update:text` у
	 * Vue). Привязка — свойство фреймворка: у остальных поля нет, и события
	 * привязки у них не существует.
	 */
	readonly model?: (exportName: string) => string
	/**
	 * Runs one update of the exchange synchronously, as one group of the
	 * framework's writes. An update is one event of a participant — the state
	 * rereads its properties, then the event and its models go out — or the
	 * release of what piled up during another mount's assembly (`TExchange`).
	 * A framework that renders on a state write renders after the event then,
	 * and before the update returns. When an update comes and in what order
	 * its steps go is the shared layer's; the profile only says how the
	 * framework applies a group of writes. Not set — every write applies on
	 * its own.
	 */
	readonly batch?: (update: () => void) => void
}
