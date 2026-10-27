import type { TLocale } from '@soldy-ui/plugins'
import type { IComponentDescriptor } from '@soldy-ui/setup'
import type { TComponentEntry, TPropControl } from './types'
import { isSnippetExtension, type TSnippetExtension } from './snippet-file'

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
	 *
	 * The events of the parts the preview places in markup
	 * (`TComponentEntry.parts`) come here too, under the part's name:
	 * `Tabs.Item>action:press` (`partsOf`). A fixture's markup is its own, and
	 * its parts are not listened to.
	 */
	onEvent?: TPreviewEventSink
	/**
	 * Сколько копий превью в корне — одним деревом фреймворка, рядом, как
	 * десятки одинаковых компонентов на странице приложения. Пропсы и
	 * слушатели у копий общие. Так монтирует стенд замера страниц
	 * (`tools/bench-pages`). Не задан — одна.
	 */
	count?: number
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
	/** Расширение файла примера: в нём «Открыть в VS Code» пишет код колонок. */
	readonly extension: TSnippetExtension
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
	 * Отдают ли слоты содержимому данные компонента — scope. `false` — нет: у
	 * Web Components содержимое слота — свет элемента, и данных ему не передать.
	 * Сценарии, которые проверяют scope (`TScenario.slotScope`), такой хост не
	 * показывает. Не задан — scope у слотов есть.
	 */
	readonly slotScope?: boolean
	/**
	 * Задаётся ли тег корня компонента пропом `tag`. `false` — нет: у Web
	 * Components тег — сам элемент, его задаёт регистрация (`<label
	 * is="so-radio-group-item">`). Сценарии, фикстуры которых задают тег
	 * пропом (`TScenario.tagProp`), такой хост не показывает. Не задан — проп
	 * `tag` есть.
	 */
	readonly tagProp?: boolean
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

/**
 * Descriptors whose events the component sends: its own and, of a
 * collection, its facade's — as its adapter declares them.
 */
export function componentDescriptors(entry: TComponentEntry): readonly IComponentDescriptor[] {
	return [
		entry.descriptor(),
		...(entry.collectionDescriptor ? [entry.collectionDescriptor()] : []),
	]
}

/**
 * Listeners of the parts the preview places in markup (`TComponentEntry.parts`)
 * — by part, in the host's form (`listen`, the same as for the component). The
 * sink gets an event under the part's name: `Tabs.Item>action:press`, the
 * owner's export name and the part's, as the consumer writes `<Tabs.Item>`.
 * One format for every host: the parity run compares the journals.
 */
export function partsOf<TListeners>(
	entry: TComponentEntry,
	sink: TPreviewEventSink,
	listen: (descriptors: readonly IComponentDescriptor[], sink: TPreviewEventSink) => TListeners,
): Readonly<Record<string, TListeners>> {
	return Object.fromEntries(
		Object.entries(entry.parts ?? {}).map(([part, descriptors]) => [
			part,
			listen(descriptors(), (name, args) => sink(`${entry.label}.${part}>${name}`, args)),
		]),
	)
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
		isSnippetExtension(value.extension) &&
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
		(value.slotScope === undefined || typeof value.slotScope === 'boolean') &&
		(value.tagProp === undefined || typeof value.tagProp === 'boolean') &&
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
