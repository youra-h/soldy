/**
 * Реестр иконок: роли как данные, без разметки.
 *
 * Механика одна на все шесть адаптеров: приложение кладёт сюда пакет иконок,
 * компоненты берут значок по роли. Сам список обязательных ролей — контракт,
 * который растёт вместе с компонентами, — лежит в наполнении
 * (`content/icons/roles.ts`): реестр о нём не знает и работает с любой строкой.
 *
 * Живёт в `setup`, потому что фреймворки сюда не импортируются: и пакет, и
 * реестр обязаны работать одинаково во всех шести адаптерах.
 */

import type { TIconSource } from './types'

/**
 * Заглушка для отсутствующей роли.
 *
 * Пустая, но валидная иконка: разметка не ломается, а `console.warn` говорит,
 * чего не хватает. Бросать исключение нельзя — из-за одной иконки упало бы
 * всё приложение.
 */
export const MISSING_ICON: TIconSource = { viewBox: '0 0 24 24', body: '' }

const registry = new Map<string, TIconSource>()
const reported = new Set<string>()

/**
 * Подключает пакет иконок или отдельные роли.
 *
 * Вызывается один раз при старте приложения. Повторный вызов дополняет и
 * перекрывает уже зарегистрированное — так точечная подмена одной иконки не
 * требует пересобирать весь набор:
 *
 * ```ts
 * setIcons(material)
 * setIcons({ close: myCloseIcon })
 * ```
 */
export function setIcons(pack: Partial<Record<string, TIconSource>>): void {
	for (const [role, source] of Object.entries(pack)) {
		if (!source) continue

		registry.set(role, source)
		reported.delete(role)
	}
}

/**
 * Иконка по роли.
 *
 * Никогда не возвращает `undefined`: у отсутствующей роли своя заглушка, и
 * предупреждение печатается один раз, а не на каждый кадр отрисовки.
 */
export function getIcon(role: string): TIconSource {
	const source = registry.get(role)

	if (source) return source

	if (!reported.has(role)) {
		reported.add(role)
		console.warn(`[soldy] Иконка «${role}» не зарегистрирована. Вызовите setIcons().`)
	}

	return MISSING_ICON
}

/** Есть ли роль в реестре. */
export function hasIcon(role: string): boolean {
	return registry.has(role)
}

/** Очищает реестр. Нужен тестам, чтобы не тянуть состояние между кейсами. */
export function resetIcons(): void {
	registry.clear()
	reported.clear()
}
