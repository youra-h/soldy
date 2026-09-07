import type { IContribution } from '@soldy/accessor'

/**
 * Слоты Tabs.
 *
 * `content` отделён от `default` не по вкусу, а структурно: `default` кладётся
 * внутрь `[role=tablist]`, и панель, попав туда, оказалась бы в списке табов.
 * Раньше панели уходили в динамический слот `panel:${value}`, который резолвил
 * только Vue; теперь это статический слот с компонентами `TabsContent`.
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
