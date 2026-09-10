import { baseExtensions, activationExtensions, selectionExtensions, assembleEngine } from './internal'
import type { TCreateEngineOptions } from './internal'

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

/**
 * Коллекция без поведения: состав, порядок, meta.
 *
 * Годится куда угодно — компонент доустановит своё при привязке.
 */
export function createEngine(options: TCreateEngineOptions = {}) {
	return assembleEngine(baseExtensions(), options.items)
}

/** Коллекция с активным элементом — модель Tabs. */
export function createEngineActivation(options: TCreateEngineOptions = {}) {
	return assembleEngine(activationExtensions(), options.items)
}

/** Коллекция с выбором — модель ListBox, Select и Accordion. */
export function createEngineSelection(options: TCreateEngineOptions = {}) {
	return assembleEngine(selectionExtensions(), options.items)
}
