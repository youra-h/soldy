/**
 * Аксессор компонента: units инстанса и плагинов дескриптора.
 *
 * Unit — `{ instance, props, events }`: свойство читается прямо с инстанса,
 * которому принадлежит, без неймспейса и карты плагинов.
 *
 * Плагины реестра units не дают: контракт компонента объявляет дескриптор, а
 * внешний плагин его не расширяет (AGENTS.md, «Плагины и расширения снаружи»).
 * Поэтому аксессор один и тот же у владельца набора и у фасада коллекции,
 * который тот же набор делит.
 */

import { TAccessor } from '@soldy/accessor'
import type { IPluginBundle } from '@soldy/plugins'
import type { IComponentDescriptor } from '../define/types'

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
	])
}
