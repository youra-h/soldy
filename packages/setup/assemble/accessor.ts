/**
 * Аксессор компонента: units инстанса, плагинов дескриптора и плагинов реестра.
 *
 * Unit — `{ instance, props, events }`: свойство читается прямо с инстанса,
 * которому принадлежит, без неймспейса и карты плагинов.
 */

import { TAccessor } from '@soldy/accessor'
import type { IPluginBundle } from '@soldy/plugins'
import type { IComponentDescriptor } from '../define/types'
import { registeredPluginsOf } from './registered'

export function assembleAccessor(
	descriptor: Pick<IComponentDescriptor, 'props' | 'events' | 'plugins'>,
	instance: object,
	bundle: IPluginBundle | null,
): TAccessor {
	return new TAccessor([
		// Unit компонента: все наследуемые + собственные props/events
		{ instance, props: descriptor.props, events: descriptor.events },
		// Units плагинов
		...descriptor.plugins
			.map((def) => ({
				instance: bundle?.get(def.ctor),
				props: def.props,
				events: def.events,
			}))
			.filter((u) => u.instance != null),
		// Units плагинов реестра — только у определений с пропсами и событиями.
		// Декларации адаптера (`getProps`) о них не знают: список статичен, а
		// реестр пополняется в рантайме. Адаптеры, которые читают пропсы по
		// аксессору, получают их сами; Vue — из `attrs` (`useSyncProps`).
		...registeredPluginsOf(bundle, instance)
			.filter((def) => def.props?.length || def.events?.length)
			.map((def) => ({
				instance: bundle?.get(def.ctor),
				props: [...(def.props ?? [])],
				events: [...(def.events ?? [])],
			})),
	])
}
