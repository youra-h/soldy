/**
 * CommonProfile — общий формат имён, не принадлежащий ни одному фреймворку.
 *
 * Им говорит всё, что устроено одинаково во всех адаптерах: ключи мешка
 * `pluginProps` (`timer_ms`), имя в конверте `plugin:event` (`timer:tick`) и
 * начальные значения при сборке — имя пропа во всех фреймворках одно, поэтому
 * сборке профиль адаптера не нужен.
 */

import { underscorePropNaming } from './naming'
import type { IAdapterProfile } from './strategy.types'

export const CommonProfile: IAdapterProfile = {
	naming: {
		prop: underscorePropNaming,
		event: (name) => name.getName(),
	},
}
