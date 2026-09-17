/**
 * Компонент на одно монтирование: инстанс, признак `embedded`, состав, набор и аксессор.
 *
 * Состав собирается один раз и дальше отвечает на все вопросы «из чего собран
 * этот компонент»: из него строится набор, по нему же — units аксессора и
 * начальные значения плагинных пропсов.
 */

import type { IComponentDescriptor } from '../define/types'
import { assembleAccessor } from './accessor'
import { assembleBundle } from './bundle'
import { resolveComposition } from './composition'
import { applyInitialPluginProps } from './plugin-props'
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

	// Регистрации приложения действуют там, где набор создаётся: пришедший
	// набор уже собран по составу своего владельца, и второй раз его состав не
	// пересматривают.
	const composition = ownsBundle
		? resolveComposition(descriptor, instance, { embedded })
		: descriptor.plugins

	const bundle = ownsBundle ? assembleBundle(composition, instance) : (input.bundle ?? null)
	const accessor = assembleAccessor(descriptor, composition, instance, bundle)

	if (ownsBundle) applyInitialPluginProps(composition, bundle, input.props)

	return { instance, embedded, bundle, ownsBundle, accessor }
}
