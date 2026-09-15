/**
 * Умолчание пропа — поле декларации.
 *
 * Источник у умолчания один: класс, которому принадлежит проп, — его
 * `static defaultValues`. Setup переносит значение в декларацию при сборке
 * дескриптора, адаптер берёт его уже оттуда (`getExportProps`) и сам ничего не
 * ищет. Раньше Vue читал `defaultValues` ядра рефлексией в адаптере, и пропы
 * плагинов умолчаний не получали вовсе.
 */

import type { IPropDeclaration } from '@soldy/accessor'

/**
 * Декларация с умолчанием из `defaultValues` класса.
 *
 * Возвращает новую декларацию, исходную не трогает: родительский дескриптор
 * делит свои декларации со всеми наследниками.
 *
 * Значим ключ, а не значение: `closable: undefined` в карте — объявленное
 * умолчание (см. `IPropDeclaration.default`). Ключа нет — нет и поля, в том
 * числе унаследованного: умолчание пересчитывается от итогового класса.
 */
export function withClassDefault(
	prop: IPropDeclaration,
	defaults: Readonly<Record<string, unknown>> | undefined,
): IPropDeclaration {
	const { default: _inherited, ...declaration } = prop
	const name = prop.name.name

	if (!defaults || !Object.hasOwn(defaults, name)) return declaration

	return { ...declaration, default: defaults[name] }
}
