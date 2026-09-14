import { baseExtensions, activationExtensions, selectionExtensions, assembleEngine } from './internal'
import type { TCreateEngineOptions } from './internal'
import type {
	TBaseCollectionExtensions,
	TActivationCollectionExtensions,
	TSelectionCollectionExtensions,
} from './types'
import type { TCollectionEngine } from '../engine'

/**
 * Публичная сборка коллекции — единственное, что уходит в `@soldy/core` из
 * этой папки. Остальное — в `./internal.ts`, и туда потребитель пакета
 * доступа не имеет.
 *
 * Движок можно собрать заранее и передать компоненту пропом `engine` — как
 * готовый инстанс передают в `ctrl`. Уровней три, и деление не произвольное:
 * оно повторяет то, что можно собрать **не зная компонента**.
 *
 * | Уровень | Что даёт |
 * |---|---|
 * | `createEngine` | состав, порядок, meta — общее у любой коллекции |
 * | `createEngineActivation` / `createEngineSelection` | + активный или выбранный элемент |
 * | `createEngineTabs` и соседи | всё, включая владельческое; нужен `owner` |
 *
 * Компонентные сборщики (третья строка) лежат не здесь, а рядом со своими
 * компонентами (`custom/<component>/collection/create.ts`) — там же, где
 * известен класс элемента.
 *
 * **Недостающее компонент добавит сам.** Отдали список уровня 1 в `<Tabs>` —
 * он доустановит `activation`, `tabs` и `content`, а не откажется работать.
 * Поэтому уровни 1–2 полезны сами по себе: заранее знать, в какой компонент
 * поедет коллекция, не обязательно.
 */

export type { TCreateEngineOptions }
export type {
	TBaseCollectionExtensions,
	TActivationCollectionExtensions,
	TSelectionCollectionExtensions,
} from './types'

/**
 * Коллекция без поведения: состав, порядок, meta.
 *
 * Годится куда угодно — компонент доустановит своё при привязке.
 */
export function createEngine<TItem extends object = object>(
	options: TCreateEngineOptions = {},
): TCollectionEngine<TItem, TBaseCollectionExtensions<TItem>> {
	// `assembleEngine` наполняет движок динамически, по строковому ключу — за
	// этим циклом компилятор точную карту расширений не видит. Приведение
	// здесь кодирует инвариант набора (`baseExtensions()` без `itemCtor` даёт
	// ровно эти пять расширений), а не затыкает несоответствие: сигнатура
	// снаружи делает вызывающего типобезопасным без единого приведения на его
	// стороне — ровно то, чего не хватало `TCollectionEngine<TItem, any>`.
	return assembleEngine(baseExtensions<TItem>(), options.items) as TCollectionEngine<
		TItem,
		TBaseCollectionExtensions<TItem>
	>
}

/** Коллекция с активным элементом — модель Tabs. */
export function createEngineActivation<TItem extends object = object>(
	options: TCreateEngineOptions = {},
): TCollectionEngine<TItem, TActivationCollectionExtensions<TItem>> {
	return assembleEngine(activationExtensions<TItem>(), options.items) as TCollectionEngine<
		TItem,
		TActivationCollectionExtensions<TItem>
	>
}

/** Коллекция с выбором — модель ListBox, Select и Accordion. */
export function createEngineSelection<TItem extends object = object>(
	options: TCreateEngineOptions = {},
): TCollectionEngine<TItem, TSelectionCollectionExtensions<TItem>> {
	return assembleEngine(selectionExtensions<TItem>(), options.items) as TCollectionEngine<
		TItem,
		TSelectionCollectionExtensions<TItem>
	>
}
