/**
 * TSharedPlugins — набор владельца, на котором работает второй контекст того же компонента.
 *
 * Адаптер коллекции делит набор компонента с фасадом: у фасада свои пропсы и
 * события, а плагины — те же. Набор ведёт тот, кто его собрал (`TOwnPlugins`):
 * он записал начальные значения, он слушает плагины снаружи, он набор и
 * уничтожит. Поэтому здесь всё, кроме состава, — пустые шаги, а не проверка
 * «чей набор» у каждого, кто с ним работает.
 *
 * Состав — плагины дескриптора: пришедший набор собран по составу своего
 * владельца, и регистрации приложения второй раз не пересматривают — так фасад
 * не получает плагин реестра дважды.
 */

import type { IPluginBundle } from '@soldy/plugins'
import type { IComponentDescriptor } from '../define/types'
import type { IComponentPlugins, ICompositionEntry } from './types'

export class TSharedPlugins implements IComponentPlugins {
	readonly composition: readonly ICompositionEntry[]

	constructor(
		descriptor: Pick<IComponentDescriptor, 'plugins'>,
		readonly bundle: IPluginBundle | null,
	) {
		this.composition = descriptor.plugins
	}

	initialize(): void {
		// Пропсы плагинов записал владелец набора
	}

	writeExternal(): void {
		// Плагины снаружи ведёт владелец набора
	}

	destroy(): void {
		// Набор и его узел уничтожит владелец
	}
}
