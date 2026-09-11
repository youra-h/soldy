import type { IContribution } from '@soldy/accessor'
import { defineType } from '../../defineType'
import type { ITabsItem } from '@soldy/core'

/**
 * Слоты Tabs.
 *
 * `content` отделён от `default` не по вкусу, а структурно: `default` кладётся
 * внутрь `[role=tablist]`, и панель, попав туда, оказалась бы в списке табов.
 * Раньше панели уходили в динамический слот `panel:${value}`, который резолвил
 * только Vue; теперь это статический слот с компонентами `TabsContent`.
 *
 * Перепутанный слот теперь не немой: `TTabsContentBindingExtension`
 * (`packages/setup/adapter/extensions/collection`) обнаруживает панель внутри
 * `[role="tablist"]` и печатает предупреждение в консоль.
 */
export type TTabsSlots = {
	leading: {}
	default: {}
	trailing: {}
	content: {}
}

export const TabsContribution = (): IContribution => ({
	slots: {
		leading: { description: 'Перед списком табов' },
		default: { description: 'Табы — элементы коллекции' },
		trailing: { description: 'После списка табов' },
		content: { description: 'Панели табов — компоненты TabsContent' },
		item: {
			scope: { item: defineType<ITabsItem>(Object) },
			description: 'Содержимое таба при работе через проп items',
		},
		'item-leading': {
			scope: { item: defineType<ITabsItem>(Object) },
			description: 'Перед содержимым таба',
		},
		'item-trailing': {
			scope: { item: defineType<ITabsItem>(Object) },
			description: 'После содержимого таба',
		},
	},
	props: {
		orientation: { type: String, triggers: ['change:orientation'] },
		alignment: { type: String, triggers: ['change:alignment'] },
		position: { type: String, triggers: ['change:position'] },
		view: { type: String, triggers: ['change:view'] },
		closable: { type: Boolean, triggers: ['change:closable'] },
	},
	// events: [
	// 	'item:close',
	// 	'item:closable',
	// 	'item:disabled',
	// 	'item:text',
	// 	'item:rendered',
	// 	'item:visible',
	// 	'item:present',
	// ],
})
