import type { IComponent } from '@soldy/core'
import type { IPluginBundle } from '@soldy/plugins'
import type { ISchema, ISyncBinding } from '../types'
import { sync } from '../sync'
import { createBundle } from './createBundle'
import type { IAdapterPlatform } from './types'

/**
 * Результат работы универсального адаптера.
 */
export interface IAdapterResult {
	/** Core-экземпляр компонента. */
	instance: IComponent<any, any>

	/** Бандл плагинов. */
	bundle: IPluginBundle

	/** Привязка синхронизации — фреймворк может подписаться для своих нужд. */
	binding: ISyncBinding

	/** Синхронизировать одно свойство из props в instance. */
	syncProp(name: string): void
}

/**
 * Универсальный адаптер — связывает core-компонент со схемой
 * через {@link IAdapterPlatform}, не завися от конкретного фреймворка.
 *
 * Создаёт core-экземпляр через `schema.Ctor` (если не передан в `props.ctrl`),
 * подписывается на изменения и пробрасывает их в платформу.
 */
export function createAdapter(
	schema: ISchema<any, any>,
	props: Record<string, any>,
	platform: IAdapterPlatform,
	existingBundle?: IPluginBundle,
): IAdapterResult {
	// 0. Instance
	const instance: IComponent<any, any> = props?.ctrl ?? new schema.Ctor({ props })

	// 1. Bundle
	const bundle = createBundle(schema, existingBundle)

	for (const Plugin of schema.plugins) {
		const plugin = bundle.get(Plugin)
		if (plugin && 'instance' in plugin) {
			;(plugin as any).instance = instance
		}
	}

	// 2. Props → Core (синхронизация одного свойства по имени)
	const syncProp = (name: string): void => {
		const propDef = schema.props[name]

		if (!propDef?.set) return

		const value = props[name]

		if (value !== undefined) propDef.set!(instance, value)
	}

	// 3. Core → Platform
	const binding = sync(schema, instance)

	binding.subscribe((emit) => {
		if (emit.type === 'property') {
			platform.emit(emit.name, emit.value)
		} else {
			platform.emit(emit.name as string, ...emit.args)
		}
	})

	// 4. Очистка
	platform.onDispose(() => binding.dispose())

	return { instance, bundle, binding, syncProp }
}
