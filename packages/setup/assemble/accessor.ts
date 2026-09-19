/**
 * Аксессор компонента: units инстанса и плагинов состава.
 *
 * Unit — `{ instance, props, events }`: свойство читается прямо с инстанса,
 * которому принадлежит, без неймспейса и карты плагинов.
 *
 * Units дают только те записи состава, у которых есть декларации, то есть
 * плагины дескриптора. Пропсы внешнего плагина в поверхность не входят: их
 * ведёт набор монтирования (`TExternalPlugins`) через `pluginProps`
 * (AGENTS.md, «Внешний плагин: пропсы — `pluginProps`, события — `plugin:event`»). Поэтому
 * фасад коллекции, делящий набор с компонентом, строит аксессор по тем же
 * правилам, что и владелец набора.
 */

import { TAccessor } from '@soldy/accessor'
import type { IPluginBundle } from '@soldy/plugins'
import type { IComponentDescriptor } from '../define/types'
import type { ICompositionEntry } from './types'

export function assembleAccessor(
	descriptor: Pick<IComponentDescriptor, 'props' | 'events'>,
	composition: readonly ICompositionEntry[],
	instance: object,
	bundle: IPluginBundle | null,
): TAccessor {
	return new TAccessor([
		// Unit компонента: все наследуемые + собственные props/events
		{ instance, props: descriptor.props, events: descriptor.events },
		// Units плагинов
		...composition
			.filter((entry) => entry.props?.length || entry.events?.length)
			.map((entry) => ({
				instance: bundle?.get(entry.ctor),
				props: entry.props,
				events: entry.events,
			}))
			.filter((unit) => unit.instance != null),
	])
}
