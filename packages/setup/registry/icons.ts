/**
 * Контракт пакета иконок и реестр ролей.
 *
 * Пакет иконок — не мешок SVG, а **реализация контракта**: список ролей,
 * которые нужны компонентам библиотеки. Ровно как тема реализует те классы,
 * которые soldy выпускает в разметку. Поэтому роли перечислены явно, а
 * conformance-тест проверяет, что пакет закрывает их все.
 *
 * Живёт в `setup`, потому что фреймворки сюда не импортируются: и пакет, и
 * реестр обязаны работать одинаково во всех шести адаптерах.
 */

/**
 * Иконка как данные, без разметки.
 *
 * `body` — содержимое `<svg>` без самого тега. Так адаптер сам решает, какие
 * атрибуты повесить на корень: размер, `aria-hidden`, классы. Отдай пакет
 * целую строку `<svg>…</svg>` — и всё это стало бы недоступно.
 *
 * Формат намеренно не привязан ни к фреймворку, ни к сборщику: обычные данные,
 * которые собираются любым бандлером и читаются в Node. Прежний
 * `import '...svg?raw'` понимал только Vite.
 */
export type TIconSource = {
	/** Система координат: `viewBox` корневого `<svg>`. */
	viewBox: string
	/** Содержимое `<svg>`: пути, группы, что угодно. */
	body: string
}

/**
 * Роли, которые компоненты библиотеки требуют от пакета иконок.
 *
 * Список закрытый: он и есть контракт. Появилась иконка в новом компоненте —
 * роль добавляется сюда, и conformance-тест сразу покажет, какие пакеты её
 * ещё не закрыли.
 */
export const ICON_ROLES = [
	'check',
	'checkIndeterminate',
	'close',
	'arrowDown',
	'arrowRight',
] as const

export type TIconRole = (typeof ICON_ROLES)[number]

/** Пакет иконок: все обязательные роли плюс любые собственные. */
export type TIconPack = Record<TIconRole, TIconSource> & Record<string, TIconSource>

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

/**
 * Каких обязательных ролей не хватает в наборе.
 *
 * Основа conformance-теста пакета: пустой массив означает, что контракт
 * закрыт целиком.
 */
export function missingIconRoles(pack: Partial<Record<string, TIconSource>>): TIconRole[] {
	return ICON_ROLES.filter((role) => !pack[role])
}
