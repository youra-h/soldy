import { defineComponent } from '../../base'
import { TSelectCollectionFacade, TSelectItemCollectionFacade } from '@soldy/core'
import {
	SelectCollectionContribution,
	SelectCollectionItemContribution,
} from '../../../contributions'
import { CollectionDescriptor } from '../collection'

export const SelectCollectionDescriptor = () =>
	defineComponent({
		ctor: TSelectCollectionFacade,

		extends: CollectionDescriptor(),

		contribution: SelectCollectionContribution(),
	})

/**
 * Без `extends`: это чистое членство в коллекции — выбранность и порядок.
 * Собственные пропсы опции приходят из SelectItemDescriptor.
 */
export const SelectCollectionItemDescriptor = () =>
	defineComponent({
		ctor: TSelectItemCollectionFacade,
		contribution: SelectCollectionItemContribution(),
	})
