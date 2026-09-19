/**
 * Умолчание пропа в декларации: из класса, а у плагина заданная опция впереди.
 *
 * Источник у умолчания один: класс, которому принадлежит проп, — его
 * `static defaultValues`. Setup переносит значение в декларацию при сборке
 * дескриптора, адаптер берёт его уже оттуда (`surfaceOf(…).exportProps`) и сам ничего не
 * ищет. Раньше Vue читал `defaultValues` ядра рефлексией в адаптере, и пропы
 * плагинов умолчаний не получали вовсе.
 */

import type { IPropDeclaration } from '@soldy/accessor'
import type { IPluginConstructor } from '@soldy/plugins'

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

/**
 * Умолчание пропа плагина: заданная опция дескриптора, иначе `defaultValues`
 * плагина.
 *
 * Опция впереди: плагин стартует с неё, и отдай адаптеру умолчание класса — Vue
 * при монтировании перетёр бы им опцию автора дескриптора. Опция считается
 * заданной, если она не `undefined`: так её читает сам плагин
 * (`options?.flip ?? …`). У `defaultValues` значим ключ — см. `withClassDefault`.
 */
export function withPluginDefault(
	prop: IPropDeclaration,
	ctor: IPluginConstructor<any, any, any>,
	options: object | undefined,
): IPropDeclaration {
	const option: unknown = options ? Reflect.get(options, prop.name.name) : undefined

	if (option === undefined) return withClassDefault(prop, ctor.defaultValues)

	return { ...prop, default: option }
}
