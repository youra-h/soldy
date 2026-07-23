export function useFormatProp(exportName: string): string {
	// Если нет namespace (нет двоеточия), возвращаем исходное имя (например, 'tag', 'visible')
	if (!exportName.includes(':')) {
		return exportName
	}

	const [namespace, propName] = exportName.split(':')

	// Приводим namespace с дефисами к camelCase (например, 'icon-styles' -> 'iconStyles')
	const formattedNamespace = namespace.replace(/-(\w)/g, (_, c) => c.toUpperCase())

	// Соединяем через подчеркивание: 'iconStyles_styles'
	return `${formattedNamespace}_${propName}`
}
