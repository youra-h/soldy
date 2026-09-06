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
export function underscorePropNaming(name: TName): string {
	if (!name.namespace) return name.name

	const namespace = name.namespace.replace(/-(\w)/g, (_, char: string) => char.toUpperCase())

	return `${namespace}_${name.name}`
}

function toPascalCase(input: string): string {
	return input
		.split(/[-:]/)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join('')
}

/**
 * `element:ready` → `onElementReady`.
 *
 * Общая стратегия для фреймворков, где события — это колбэк-пропы: React и
 * Svelte 5. Тип-зеркало живёт в naming.types.ts и обязано меняться синхронно.
 */
export function callbackEventNaming(name: TName): string {
	const base = name.namespace ? `${name.namespace}:${name.name}` : name.name

	return `on${toPascalCase(base)}`
}
