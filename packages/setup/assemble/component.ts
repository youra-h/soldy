/**
 * Компонент на одно монтирование: инстанс, признак `embedded`, набор (свой или общий) и аксессор.
 *
 * Набор и аксессор строят методы дескриптора (`createBundle`,
 * `createAccessor`): о дескрипторе сборка знает только его контракт.
 */

import type { IComponentDescriptor } from '../define/types'
import type { IAssembledComponent, IAssemblyInput } from './types'

/**
 * Имя места вложенного компонента: из входа, а без него — из пропсов фреймворка.
 * Проп `embedded` объявлен у всех компонентов (`EntityContribution`), и читает
 * его setup, а не каждый адаптер: шаг, который шесть адаптеров обязаны помнить,
 * седьмой забудет.
 */
function embeddedOf(input: IAssemblyInput): string | undefined {
	if (input.embedded !== undefined) return input.embedded

	const value: unknown = input.props ? Reflect.get(input.props, 'embedded') : undefined

	return typeof value === 'string' ? value : undefined
}

export function assembleComponent<TInstance extends object>(
	descriptor: IComponentDescriptor<any, any, any, any, TInstance>,
	input: IAssemblyInput<TInstance>,
): IAssembledComponent<TInstance> {
	const instance = input.ctrl ?? new descriptor.ctor(input.props ?? {}, input.options ?? {})
	// Набор, пришедший на вход, принадлежит тому, кто его передал (адаптер
	// коллекции делит bundle компонента) — уничтожает его он же.
	const ownsBundle = input.bundle === undefined
	const embedded = embeddedOf(input)
	const bundle = input.bundle ?? descriptor.createBundle(instance, { embedded })
	const accessor = descriptor.createAccessor(instance, bundle)

	return { instance, embedded, bundle, ownsBundle, accessor }
}
