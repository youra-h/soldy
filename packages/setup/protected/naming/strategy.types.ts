/**
 * Профиль фреймворка: стратегия имён, которую даёт адаптер, а применяет общий слой.
 *
 * Ядро и дескриптор говорят на одном языке (`text`, `aria:label`,
 * `change:text`), каждый фреймворк — на своём. Всё, чем фреймворки различаются
 * в именах, собрано в одной константе адаптера (`VueProfile`, `ReactProfile`,
 * …); её идентичность — ключ кэша поверхности.
 */

import type { TName } from '../define/name.class'

/** Правила имён пропсов и событий во фреймворке. */
export interface INamingStrategy {
	/** Имя пропа: одно во всех фреймворках — `text`, `aria_label` (`underscorePropNaming`). */
	prop(name: TName): string
	/** Имя события: `change:text` у Vue, `onChangeText` у React, `changeText` у Angular. */
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
}
