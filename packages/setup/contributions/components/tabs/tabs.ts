import type { IContribution } from '@soldy/accessor'

export const TabsContribution: IContribution = {
	props: [
		{ name: 'orientation', type: String, triggers: ['change:orientation'] },
		{ name: 'alignment', type: String, triggers: ['change:alignment'] },
		{ name: 'position', type: String, triggers: ['change:position'] },
		{ name: 'view', type: String, triggers: ['change:view'] },
		{ name: 'closable', type: Boolean, triggers: ['change:closable'] },
	],
	// events: [
	// 	'item:close',
	// 	'item:closable',
	// 	'item:disabled',
	// 	'item:text',
	// 	'item:rendered',
	// 	'item:visible',
	// 	'item:present',
	// ],
}
