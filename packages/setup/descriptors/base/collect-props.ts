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
	props: Readonly<Record<string, any>>,
): Record<string, any> {
	const result: Record<string, any> = {}

	for (const decl of decls) {
		if (decl.protected) continue

		const key = decl.name.name

		if (key in props && props[key] !== undefined) {
			result[key] = props[key]
		}
	}

	return result
}

/** Item-level пропсы коллекции (active, selected, ...). */
export function collectItemProps(
	itemProps: IPropDeclaration[],
	props: Readonly<Record<string, any>>,
): Record<string, any> {
	return collectDeclaredProps(itemProps, props)
}
