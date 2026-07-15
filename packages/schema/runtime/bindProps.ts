import type { ISchema } from '../types'

/**
 * Перебирает все props из схемы и вызывает callback для каждого.
 *
 * @param schema — схема компонента
 * @param fn — коллбэк, вызывается для каждого имени свойства
 */
export function bindProps(schema: ISchema<any, any>, fn: (name: string) => void): void {
	for (const name of Object.keys(schema.props)) {
		fn(name)
	}
}
