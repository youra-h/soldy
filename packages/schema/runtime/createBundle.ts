import { TPluginBundle } from '@soldy/plugins'
import type { IPluginBundle } from '@soldy/plugins'
import type { ISchema } from '../types'

/**
 * Создаёт и наполняет {@link IPluginBundle} из схемы компонента.
 *
 * @param schema   — схема компонента
 * @param existing — существующий бандл (если передан, возвращается как есть)
 */
export function createBundle(schema: ISchema<any, any>, existing?: IPluginBundle): IPluginBundle {
	if (existing) return existing

	const bundle = new TPluginBundle()

	for (const Plugin of schema.plugins ?? []) {
		bundle.use(Plugin)
	}

	return bundle
}
