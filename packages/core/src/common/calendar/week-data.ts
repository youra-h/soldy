/**
 * @license
 * The first day of the week by region is Unicode CLDR data: CLDR 48,
 * cldr-json 48.2.0, cldr-core/supplemental/weekData.json, weekData.firstDay.
 * © Unicode, Inc., licensed under the Unicode License v3. The license text
 * ships with this package as LICENSE-Unicode-3.0.
 *
 * Changes to the source data: only the regions whose week does not start on
 * Monday are kept, grouped by their first day; the alternative variant
 * (GB-alt-variant) and the world default (001, Monday) are dropped.
 */

import type { TWeekday } from './types'

/**
 * Регионы, где неделя начинается не с понедельника, — по первому дню: 0 —
 * воскресенье, 5 — пятница, 6 — суббота. Региона нет в таблице — понедельник,
 * как у мира (`001`) в CLDR.
 *
 * Таблица, а не `Intl.Locale#getWeekInfo`: его нет в Firefox до 153, а в
 * Node 22 — только старый геттер, и сервер с браузером разошлись бы колонками
 * сетки. Данные чужие — CLDR под Unicode License v3, поэтому шапка `@license`
 * выше и `LICENSE-Unicode-3.0` рядом с манифестом пакета (AGENTS.md, «Даты»).
 */
export const WEEK_START_REGIONS: ReadonlyArray<readonly [TWeekday, string]> = [
	[
		0,
		'AG AS BD BR BS BT BW BZ CA CO DM DO ET GT GU HK HN ID IL IN IS JM JP KE KH KR LA MH MM MO MT MX MZ NI NP PA PE PH PK PR PT PY SA SG SV TH TT TW UM US VE VI WS YE ZA ZW',
	],
	[5, 'MV'],
	[6, 'AF BH DJ DZ EG IQ IR JO KW LY OM QA SD SY'],
]
