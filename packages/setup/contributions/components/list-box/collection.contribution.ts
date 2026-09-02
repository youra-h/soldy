import type { IContribution } from '@soldy/accessor'

/**
 * Специфичные коллекционные props/events владельца ListBox.
 * Общие (mode, selected) наследуются из ListCollectionContribution через дескриптор.
 */
export const ListBoxCollectionContribution = (): IContribution => ({})

/**
 * Item-level специфичные пропсы элемента ListBox.
 * Общие (selected, order, wordWrap) наследуются из ListCollectionItemContribution.
 */
export const ListBoxCollectionItemContribution = (): IContribution => ({
	props: {
		list_view: {
			type: String,
			protected: true,
			get: (instance) => instance.view,
			triggers: ['change:view'],
		},
	},
})
