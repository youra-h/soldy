import type { IComponentDescriptor } from '@soldy/setup'

/** Чем редактировать проп. Выводится из метаданных, руками не задаётся. */
export type TControlKind = 'switch' | 'text' | 'number' | 'select'

export type TPropControl = {
	name: string
	kind: TControlKind
	/** Значения для `select`; у остальных пусто. */
	options?: readonly string[]
	description: string
	/** Значение по умолчанию из `ctor.defaultValues`. */
	default?: unknown
}

export type TComponentEntry = {
	/** Ключ в маршруте: `/component/button`. */
	id: string
	/** Подпись в меню и заголовке. */
	label: string
	/** Фабрика дескриптора — источник пропов, событий и слотов. */
	descriptor: () => IComponentDescriptor
	/**
	 * Показывать ли на витрине. Слои вроде `Control` или `Stylable` компонентами
	 * не являются — у них есть страница, но выставлять их незачем.
	 */
	showcase: boolean
	/** Ширина ячейки витрины в колонках сетки. */
	span: 1 | 2
	/** Короткая строка под заголовком страницы. */
	description: string
}

export type TThemeEntry = {
	id: string
	label: string
	/** Значение `data-theme` для светлой схемы; тёмная — `${value}-dark`. */
	value: string
}

export type TIconPackEntry = {
	id: string
	label: string
}
