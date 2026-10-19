/**
 * Значение так, как его пишут в коде примера, — литерал JS:
 * `{ style: 'percent', maximumFractionDigits: 1 }`.
 *
 * Один на все хосты: код колонок пишут пять хостов, и пять копий литерала уже
 * разошлись — у Vue строка не экранировала `\`. Объект и список копии отдавали
 * JSON, а его двойные кавычки обрывали атрибут шаблона Vue, где выражение само
 * стоит в двойных кавычках. Поэтому строка здесь — в одинарных кавычках, как
 * её пишут в коде, а что значимо в самой разметке (сущности HTML в атрибуте
 * Vue), экранирует хост своего синтаксиса.
 *
 * Значения — данные стенда: строки, числа и флаги строк, списки и простые
 * объекты пресетов (`PRESETS`, `PRESET_VALUES`). Объект пишется по своим
 * перечислимым полям, как его пишет и JSON; ключ, который не идентификатор, —
 * строкой. Пустое поле сюда не доходит: такой проп не задан, и в коде его нет
 * вовсе.
 */
export function snippetLiteral(value: unknown): string {
	if (typeof value === 'string') return quote(value)
	if (Array.isArray(value)) return `[${value.map(snippetLiteral).join(', ')}]`
	if (typeof value === 'object' && value !== null) return objectLiteral(value)

	return String(value)
}

/** Строка в одинарных кавычках: `\` и `'` внутри экранируются. */
function quote(text: string): string {
	return `'${text.replace(/[\\']/g, '\\$&')}'`
}

/** Объект по перечислимым полям, с пробелами внутри скобок; пустой — `{}`. */
function objectLiteral(value: object): string {
	const fields = Object.entries(value).map(
		([key, field]) => `${keyOf(key)}: ${snippetLiteral(field)}`,
	)

	return fields.length ? `{ ${fields.join(', ')} }` : '{}'
}

/** Имя, которое ключ объекта пишет без кавычек. */
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/

/** Ключ поля: идентификатор — как есть, остальное — строкой (`'aria-label'`). */
function keyOf(key: string): string {
	return IDENTIFIER.test(key) ? key : quote(key)
}
