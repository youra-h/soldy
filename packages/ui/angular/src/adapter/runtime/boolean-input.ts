/**
 * Transform булева входа: атрибут без значения (`disabled`) — `true`.
 *
 * Параметр — ровно `boolean | '' | undefined`: строгий шаблон берёт тип записи
 * у него, и `disabled="yes"` остаётся ошибкой. `booleanAttribute` не годится:
 * параметр `unknown`, а `undefined` он делает `false`. Без дженерика и
 * перегрузок — иначе компилятор Angular transform отклонит.
 */
export function booleanInput(value: boolean | '' | undefined): boolean | undefined {
	return value === '' ? true : value
}
