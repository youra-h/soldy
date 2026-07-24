import type { IContribution } from '@soldy/accessor'

export const TabsContribution: IContribution = {
	props: [
		{ name: 'orientation', triggers: ['change:orientation'] },
		{ name: 'alignment', triggers: ['change:alignment'] },
		{ name: 'position', triggers: ['change:position'] },
		{ name: 'view', triggers: ['change:view'] },
		{ name: 'closable', triggers: ['change:closable'] },
	],
	events: [
		'item:close',
		'item:closable',
		'item:disabled',
		'item:text',
		'item:rendered',
		'item:visible',
		'item:present',
	],
}
