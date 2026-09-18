/**
 * Плагины реестра, поставленные в набор, и чей аксессор их получает.
 *
 * Аксессор строится после набора и берёт пропсы и события плагинов реестра
 * отсюда: пересчитать реестр заново нельзя — между сборкой набора и аксессора
 * регистрации могли смениться.
 *
 * Отдаются только аксессору владельца набора: фасад коллекции делит набор с
 * компонентом, и без сверки инстанса событие плагина ушло бы наружу дважды.
 */

import type { IPluginBundle } from '@soldy/plugins'
import type { IResolvedPlugin } from '../registry'

const bundleRegistrations = new WeakMap<
	IPluginBundle,
	{ readonly owner: object; readonly plugins: readonly IResolvedPlugin[] }
>()

export function rememberRegisteredPlugins(
	bundle: IPluginBundle,
	owner: object,
	plugins: readonly IResolvedPlugin[],
): void {
	bundleRegistrations.set(bundle, { owner, plugins })
}

export function registeredPluginsOf(
	bundle: IPluginBundle | null,
	instance: object,
): readonly IResolvedPlugin[] {
	const record = bundle ? bundleRegistrations.get(bundle) : undefined

	return record?.owner === instance ? record.plugins : []
}
