/**
 * Иконка по роли — тег для `Icon`, как `roleIcon` у Vue. Компонент на лету
 * Svelte не соберёт, поэтому это метка: по ней `Dynamic` рисует `RoleIcon`.
 * Метка одна на роль — повторный вызов не меняет свойство `tag`. Ключа `tag`
 * у неё нет: по нему `TIcon.getInstance` отличает пропсы иконки от тега.
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
