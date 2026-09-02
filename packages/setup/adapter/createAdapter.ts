/**
 * Framework-agnostic адаптер: создаёт instance, bundle, accessor из дескриптора.
 *
 * Не зависит от конкретного фреймворка — используется как фундамент для
 * Vue-адаптера (useAdapter), React-адаптера, и т.д.
 */

import type { IComponentDescriptor } from '../descriptors'

export function createAdapter(
    descriptor: IComponentDescriptor,
    options: { ctrl?: any; plugins?: any; props?: any },
) {
    // Если instance не передан — создаём его через конструктор из дескриптора.
    const instance = options.ctrl ?? new (descriptor.ctor as any)({ props: options.props })

    // Если bundle не передан — создаём его через дескриптор.
    const bundle = options.plugins ?? descriptor.createBundle()

    const accessor = descriptor.createAccessor(instance, bundle)

    return { instance, bundle, accessor }
}
