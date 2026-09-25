/**
 * Окружение тестов React: обновления идут через `act`.
 *
 * React узнаёт тестовое окружение по флагу `IS_REACT_ACT_ENVIRONMENT` на
 * глобальном объекте. Без флага каждый `act` печатает «The current testing
 * environment is not configured to support act(...)», а обновление состояния
 * в обход `act` проходит молча — хотя именно оно делает тест нестабильным:
 * утверждение читает DOM раньше, чем React его обновил. С флагом React
 * предупреждает о таком обновлении («An update to X inside a test was not
 * wrapped in act(...)»), и чинится оно в тесте, а не глушением консоли.
 *
 * Флаг здесь, а не в `mount.ts`: часть файлов создаёт корни React сама.
 */

declare global {
	/** Флаг React: тестовое окружение, где обновления оборачивает `act`. */
	var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true

export {}
