/**
 * Иконка по роли из реестра — тег для `Icon` (аналог `roleIcon` у Vue и
 * React).
 *
 * Vue и React строят на роль свой компонент. Svelte компонент на лету не
 * соберёт: его делает компилятор. Поэтому `roleIcon(role)` отдаёт метку — та
 * говорит корню (`Dynamic`), что рисовать нужно `<svg>` иконки этой роли, и
 * корень узнаёт её `instanceof`. Рисует иконку `RoleIcon` адаптера: атрибуты
 * корня — на `<svg>`, `viewBox` и содержимое — из пакета иконок.
 *
 * Метка неизменяема и одна на роль: `tag` с той же ролью — то же значение, и
 * свойство инстанса не меняется от повторного вызова. Ключа `tag` у метки
 * нет: по нему `TIcon.getInstance` отличает объект пропсов иконки от значения
 * тега. Это не хук: зовётся где угодно, в том числе в разметке компонента.
 */
export class TRoleIcon {
	constructor(readonly role: string) {
		Object.freeze(this)
	}
}

const marks = new Map<string, TRoleIcon>()

export function roleIcon(role: string): TRoleIcon {
	const known = marks.get(role)

	if (known) return known

	const mark = new TRoleIcon(role)

	marks.set(role, mark)

	return mark
}
