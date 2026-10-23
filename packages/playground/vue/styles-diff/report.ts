/**
 * Отчёт сравнения стилей — данными и текстом. Модуль без DOM и без Node: данные
 * собирает прогон в браузере (`compare.spec.ts`), текст печатает команда
 * прогона (`vitest.styles.config.ts`).
 */

/** Различие одного свойства у одного узла. */
export type TStyleDifference = {
	/** Страница стенда: фреймворк и компонент, `vue/button`. */
	readonly page: string
	/** Схема темы: `light` или `dark`. */
	readonly scheme: string
	/**
	 * Узел библиотеки — с классом `so-*`. Остальные — без класса: внутренние
	 * узлы части (поле Input, рисунок иконки) или содержимое слота.
	 */
	readonly library: boolean
	/** Путь узла от внешней части: `div.so-input > input`. */
	readonly path: string
	/** Псевдоэлемент (`::before`) или пустая строка — сам узел. */
	readonly pseudo: string
	/**
	 * Свойство CSS. Узел, которого под одним из листов нет, — `(узел)`;
	 * псевдоэлемент, который есть только под одним, — `(псевдоэлемент)`.
	 */
	readonly property: string
	readonly before: string
	readonly after: string
}

/** Сколько узлов без класса страница держала приколотыми к стилю «до». */
export type TPinNote = {
	readonly page: string
	readonly scheme: string
	readonly count: number
}

/** Значение в строке отчёта: пустое — заметно. */
const shown = (value: string) => (value === '' ? '""' : value)

const pageOf = (entry: { page: string; scheme: string }) => `${entry.page} · ${entry.scheme}`

/**
 * Строки группы: под каждым путём — различия, и свойства с одними и теми же
 * значениями и счётом узлов — одной строкой (восемь стилей рамки — одна).
 */
function groupLines(group: readonly TStyleDifference[]): string[] {
	const counts = new Map<string, { difference: TStyleDifference; count: number }>()

	for (const difference of group) {
		const key = [
			difference.path,
			difference.pseudo,
			difference.property,
			difference.before,
			difference.after,
		].join('\u0000')
		const known = counts.get(key)

		if (known) known.count++
		else counts.set(key, { difference, count: 1 })
	}

	/** Путь → значения «до → после» и счёт → свойства. */
	const byPath = new Map<string, Map<string, string[]>>()

	for (const { difference, count } of counts.values()) {
		const path = difference.path + difference.pseudo
		const values = byPath.get(path) ?? new Map<string, string[]>()
		const times = count > 1 ? ` (×${count})` : ''
		const key = `${shown(difference.before)} → ${shown(difference.after)}${times}`

		values.set(key, [...(values.get(key) ?? []), difference.property])
		byPath.set(path, values)
	}

	return [...byPath].flatMap(([path, values]) => [
		`    ${path}`,
		...[...values].map(([key, properties]) => `      ${properties.join(', ')}: ${key}`),
	])
}

/**
 * Отчёт: страница и схема, узлы `so-*` и без класса, под каждым путём —
 * различия со счётом узлов, где они есть.
 */
export function formatReport(
	differences: readonly TStyleDifference[],
	pins: readonly TPinNote[] = [],
): string {
	const pages = new Map<string, TStyleDifference[]>()

	for (const difference of differences) {
		const page = pageOf(difference)

		pages.set(page, [...(pages.get(page) ?? []), difference])
	}

	const lines: string[] = []

	for (const [page, list] of pages) {
		lines.push(page)

		const pinned = pins.find((note) => pageOf(note) === page)?.count ?? 0

		for (const library of [true, false]) {
			const group = list.filter((difference) => difference.library === library)

			if (group.length === 0) continue

			lines.push(library ? '  узлы so-*:' : '  узлы без класса:', ...groupLines(group))
		}

		if (pinned > 0) {
			lines.push(
				`  узлы so-* сверены при ${pinned} узлах без класса, приколотых к стилю «до»`,
			)
		}
	}

	return lines.length === 0 ? '' : `${lines.join('\n')}\n`
}

/** Итог прогона: сколько различий в каждой группе. */
export function formatSummary(differences: readonly TStyleDifference[]): string {
	const library = differences.filter((difference) => difference.library).length

	return [
		'',
		`Сравнение стилей: у узлов so-* различий ${library}, у узлов без класса — ${differences.length - library}.`,
		'',
	].join('\n')
}
