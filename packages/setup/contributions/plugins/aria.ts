import type { IContribution } from '@soldy/accessor'
import { PLUGIN_EVENTS } from '@soldy/plugins'

/**
 * Единственный плагин, чьи пропсы пишутся снаружи, а не только читаются: имя
 * задаёт потребитель, вычислить его неоткуда.
 *
 * Вычисленного набора здесь нет: плагин пишет свою часть в общий `aria`
 * компонента, а тот уже объявлен в `ComponentViewContribution`. Отдельный
 * `aria_attributes` заставлял бы разметку складывать два набора спредом — от
 * этого и уходили.
 */
export const AriaContribution = (): IContribution => ({
	events: [...PLUGIN_EVENTS],
	props: {
		label: { type: String, triggers: ['change:label'] },
		labelledBy: { type: String, triggers: ['change:labelledBy'] },
		describedBy: { type: String, triggers: ['change:describedBy'] },
	},
})
