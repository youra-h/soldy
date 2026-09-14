import type { IPropDeclaration } from '@soldy/accessor'

// TODO remove

/**
 * Собрать значения входных (не protected) пропсов, объявленных в `decls`,
 * из набора `props`. Ключ результата — сырое имя пропса (decl.name.name).
 *
 * Базовый примитив: отделяет объявленные пропсы конкретного уровня
 * (item-level или owner-level) от остального набора props.
 */
export function collectDeclaredProps(
	decls: IPropDeclaration[],
	props: object,
): Record<string, unknown> {
	const result: Record<string, unknown> = {}

	for (const decl of decls) {
		if (decl.protected) continue

		const key = decl.name.name

		const value: unknown = Reflect.get(props, key)

		if (value !== undefined) {
			result[key] = value
		}
	}

	return result
}

/** Item-level пропсы коллекции (active, selected, ...). */
export function collectItemProps(
	itemProps: IPropDeclaration[],
	props: object,
): Record<string, unknown> {
	return collectDeclaredProps(itemProps, props)
}
