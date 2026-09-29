import {
	baseExtensions,
	activationExtensions,
	selectionExtensions,
	completeEngine,
	fillEngine,
} from './internal'
import type { TCreateEngineOptions } from './internal'
import type {
	TBaseCollectionExtensions,
	TActivationCollectionExtensions,
	TSelectionCollectionExtensions,
} from './types'
import type { TCollectionEngine } from '../engine'

/**
 * Публичная сборка коллекции — единственное, что уходит в `@soldy-ui/core` из
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
 * | `createEngineTabs` и соседи | всё; детали владельца — если дали `owner` |
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
	options: TCreateEngineOptions<TItem> = {},
): TCollectionEngine<TItem, TBaseCollectionExtensions<TItem>> {
	return fillEngine(completeEngine(undefined, baseExtensions<TItem>()), options.items)
}

/** Коллекция с активным элементом — модель Tabs. */
export function createEngineActivation<TItem extends object = object>(
	options: TCreateEngineOptions<TItem> = {},
): TCollectionEngine<TItem, TActivationCollectionExtensions<TItem>> {
	return fillEngine(completeEngine(undefined, activationExtensions<TItem>()), options.items)
}

/** Коллекция с выбором — модель ListBox, Select и Accordion. */
export function createEngineSelection<TItem extends object = object>(
	options: TCreateEngineOptions<TItem> = {},
): TCollectionEngine<TItem, TSelectionCollectionExtensions<TItem>> {
	return fillEngine(completeEngine(undefined, selectionExtensions<TItem>()), options.items)
}
