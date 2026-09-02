import type { IContribution } from '@soldy/accessor'
import { defineType } from './../../defineType'
import { TButtonView } from '@soldy/core'

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
		view: {
			type: defineType<TButtonView>(String),
			protected: true,
			triggers: ['change:view'],
		},
	},
})
