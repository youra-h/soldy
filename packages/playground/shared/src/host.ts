import type { TLocale } from '@soldy-ui/plugins'
import type { TComponentEntry, TPropControl } from './types'

/**
 * Хост превью — фреймворковая половина стенда.
 *
 * Оболочка стенда одна, на Vue: шапку, меню и редакторы пропов она рисует
 * компонентами soldy. Компонент на странице рисует хост фреймворка,
 * выбранного в шапке, — в свой корень, на узле, который дала оболочка. Об
 * оболочке хост не знает, оболочка о хосте — только этот контракт: что он умеет
 * нарисовать, как смонтировать и на каком языке.
 *
 * Состояние страницы держит оболочка: значение строки, экземпляр ядра и движок
 * уходят хосту пропсами. Поэтому смена фреймворка перемонтирует только сцену, а
 * выставленное на странице переживает её.
 */

/** Куда хост отдаёт событие компонента: полное имя ядра и аргументы. */
export type TPreviewEventSink = (name: string, args: readonly unknown[]) => void

/** Что смонтировать. */
export type TPreviewMount = {
	/** Компонент — идентификатор реестра (`button`), он же ключ карты превью. */
	component: string
	/** Ключ фикстуры — разметки со слотами. Без него рисуется превью компонента. */
	fixture?: string
	/**
	 * Пропсы — именами, как их пишут в разметке: `aria_label`, `ctrl`,
	 * `engine`. Слушателей среди них нет: события хост отдаёт в `onEvent`.
	 */
	props: Readonly<Record<string, unknown>>
	/**
	 * Все события, которые компонент объявил (свои и фасада коллекции), —
	 * под полными именами ядра: `change:text`, `action:press`. Имена
	 * фреймворка (`onChangeText`) к ним приводит хост. Нет приёмника — хост не
	 * слушает ничего.
	 */
	onEvent?: TPreviewEventSink
}

/** Смонтированное превью. */
export interface IPreviewHandle {
	/** Новые пропсы — целиком, а не разница: отрисует их фреймворк в своём такте. */
	update(props: Readonly<Record<string, unknown>>): void
	/** Снять компонент: узел монтирования остаётся пустым. */
	unmount(): void
}

/** Код колонок страницы свойств — в синтаксисе фреймворка хоста. */
export interface IPreviewSnippets {
	/** Колонка «Component»: значение приходит пропом. */
	propSnippet(
		entry: TComponentEntry,
		prop: string,
		value: unknown,
		preset?: Record<string, unknown>,
	): string
	/** Колонка «Component Instance»: значение пишется в экземпляр ядра. */
	instanceSnippet(entry: TComponentEntry, control: TPropControl, value: unknown): string
}

export interface IPreviewHost {
	/**
	 * Компоненты, которые хост умеет нарисовать, — ключи его карты превью.
	 * Меню и витрина оболочки — пересечение реестра с ними.
	 */
	readonly previews: readonly string[]
	/**
	 * Фикстуры сценариев — ключи. Сценарий виден, если у хоста есть и
	 * компонент, и его фикстура.
	 */
	readonly fixtures: readonly string[]
	/**
	 * Смонтировать компонент в узел — в свой корень фреймворка.
	 *
	 * Синхронно: к возврату компонент в DOM. Кадр, к которому `TElementPlugin`
	 * отдаёт узел плагинам, ждёт вызывающий.
	 */
	mount(node: HTMLElement, mount: TPreviewMount): IPreviewHandle
	/**
	 * Язык шапки — всем корням хоста, без перемонтирования. Контекст
	 * провайдера оболочки в чужой корень не проходит, поэтому у каждого корня
	 * свой `LocaleProvider`, и локаль ему даёт хост.
	 */
	setLocale(locale: TLocale): void
	/** Код колонок. Нет его — у колонок нет блоков кода. */
	readonly snippets?: IPreviewSnippets
}

/** Модуль хоста: хост — его экспорт по умолчанию. */
export type TPreviewHostModule = { default: IPreviewHost }

function isObject(value: unknown): value is Record<PropertyKey, unknown> {
	return typeof value === 'object' && value !== null
}

function isKeys(value: unknown): value is readonly string[] {
	return Array.isArray(value) && value.every((key) => typeof key === 'string')
}

function isSnippets(value: unknown): value is IPreviewSnippets {
	return (
		isObject(value) &&
		typeof value.propSnippet === 'function' &&
		typeof value.instanceSnippet === 'function'
	)
}

/** Хост ли это — по форме, которую обещает контракт. */
export function isPreviewHost(value: unknown): value is IPreviewHost {
	return (
		isObject(value) &&
		isKeys(value.previews) &&
		isKeys(value.fixtures) &&
		typeof value.mount === 'function' &&
		typeof value.setLocale === 'function' &&
		(value.snippets === undefined || isSnippets(value.snippets))
	)
}

/**
 * Модуль ли это хоста — то, что отдал загрузчик оболочки.
 *
 * Загрузчик получает модуль ленивым `import()`, и тип у него `unknown`:
 * приведение к хосту спрятало бы модуль, который экспортирует не то. Сторож
 * проверяет форму и отказывает громко.
 */
export function isPreviewHostModule(value: unknown): value is TPreviewHostModule {
	return isObject(value) && isPreviewHost(value.default)
}
