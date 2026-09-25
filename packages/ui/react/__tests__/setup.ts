/**
 * Окружение тестов React: обновления идут через `act`, а ошибка или
 * предупреждение в консоли роняет тест.
 *
 * Файл общий для всех спеков пакета (`setupFiles` в `vitest.config.ts`), а не
 * часть `mount.ts`: часть файлов создаёт корни React сама.
 */

import { afterEach, beforeEach, expect } from 'vitest'
import { format } from 'node:util'

/**
 * React узнаёт тестовое окружение по флагу `IS_REACT_ACT_ENVIRONMENT` на
 * глобальном объекте. Без флага каждый `act` печатает «The current testing
 * environment is not configured to support act(...)», а обновление состояния
 * в обход `act` проходит молча — хотя именно оно делает тест нестабильным:
 * утверждение читает DOM раньше, чем React его обновил. С флагом React
 * предупреждает о таком обновлении («An update to X inside a test was not
 * wrapped in act(...)»), и чинится оно в тесте, а не глушением консоли.
 */

declare global {
	/** Флаг React: тестовое окружение, где обновления оборачивает `act`. */
	var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true

/**
 * Сторож консоли: `console.error` или `console.warn` во время теста роняет
 * этот тест.
 *
 * О проблеме теста — обновлении мимо `act`, дубле ключа, неизвестном атрибуте
 * — React сообщает только строкой в консоли, и прогон оставался зелёным: так
 * предупреждения об `act` и копились, пока не стали шумом в каждом тесте.
 * Вывод сторож не глушит: в логе прогона он остаётся таким, каким его
 * напечатали.
 *
 * Фильтра по тексту нет намеренно: предупреждение React и диагностика самой
 * библиотеки — одинаково находки. Шумит сторож — чинится причина, а не он.
 * Тест, который вывод ожидает (предупреждение подписи о вложенном `label`),
 * заявляет это своим шпионом с заглушкой —
 * `vi.spyOn(console, 'warn').mockImplementation(() => {})`: заглушка метод под
 * шпионом не зовёт, и сторож такого вызова не видит. Поэтому сам сторож —
 * обёртка, а не `vi.spyOn`: повторный `vi.spyOn` на тот же метод вернул бы
 * шпиона сторожа, и заявленный тестом вывод уронил бы тест.
 *
 * `afterEach` сторожа идёт последним: хуки файла настройки встают раньше
 * хуков спека, а `afterEach` Vitest зовёт в обратном порядке (`sequence.hooks`
 * по умолчанию — `'stack'`). К проверке тест уже снял своих шпионов, а вывод
 * при размонтировании корней — в `mount.ts` или в хуке самого спека — идёт в
 * счёт.
 */

/** Методы консоли, вызов которых роняет тест. */
type TGuardedMethod = 'error' | 'warn'

/** Тексты вызовов за текущий тест — как их печатает консоль. */
let messages: string[] = []

/** Вернуть методы консоли, какими их застал `beforeEach`. */
let restore: Array<() => void> = []

/** Обернуть метод консоли: вызов записывается в `into` и печатается как есть. */
function watch(method: TGuardedMethod, into: string[]): () => void {
	const original: (...args: unknown[]) => void = console[method]

	console[method] = (...args: unknown[]) => {
		into.push(`console.${method}: ${format(...args)}`)
		original.apply(console, args)
	}

	return () => {
		console[method] = original
	}
}

beforeEach(() => {
	messages = []
	restore = [watch('error', messages), watch('warn', messages)]
})

afterEach(() => {
	// Консоль возвращается до проверки: после упавшего `expect` хук дальше не идёт
	for (const undo of restore.splice(0)) undo()

	expect(messages, 'в консоль ушли ошибки или предупреждения').toEqual([])
})
