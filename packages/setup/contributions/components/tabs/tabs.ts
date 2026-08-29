import type { IContribution } from '@soldy/accessor'

export const TabsContribution = (): IContribution => ({
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
