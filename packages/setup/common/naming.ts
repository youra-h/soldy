/**
 * Общая часть стратегий именования, одинаковая во всех фреймворках.
 *
 * Различается только `event`: Vue сохраняет двоеточие (`element:ready`),
 * React делает колбэк-проп (`onElementReady`), Angular — camelCase-аутпут
 * (`elementReady`). Имя пропа же везде одно и то же, потому что публичный
 * API компонентов должен читаться одинаково на всех фреймворках.
 */

import type { TName } from '@soldy/accessor'

/**
 * `styles` @ ns `icon-styles` → `iconStyles_styles`; без namespace — как есть.
 *
 * Двоеточие в имени пропа недопустимо (это не валидный JS-идентификатор
 * и не биндится в шаблонах), поэтому namespace склеивается через `_`.
 */
export function defaultPropNaming(name: TName): string {
	if (!name.namespace) return name.name

	const namespace = name.namespace.replace(/-(\w)/g, (_, char: string) => char.toUpperCase())

	return `${namespace}_${name.name}`
}
