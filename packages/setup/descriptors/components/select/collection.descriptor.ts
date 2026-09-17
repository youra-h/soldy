import { defineComponent, defineDescriptor } from '../../../define'
import { TSelectCollectionFacade, TSelectItemCollectionFacade } from '@soldy/core'
import {
	SelectCollectionContribution,
	SelectCollectionItemContribution,
} from '../../../contributions'
import { CollectionDescriptor } from '../collection'

export const SelectCollectionDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TSelectCollectionFacade,

		extends: CollectionDescriptor(),

		contribution: SelectCollectionContribution(),
	}),
)

/**
 * Без `extends`: это чистое членство в коллекции — выбранность и порядок.
 * Собственные пропсы опции приходят из SelectItemDescriptor.
 */
export const SelectCollectionItemDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TSelectItemCollectionFacade,
		contribution: SelectCollectionItemContribution(),
	}),
)
