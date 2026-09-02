/**
 * Дескриптор SelectableCollectionItem (TSelectableCollectionItem).
 */

import { defineComponent } from '../../../base'
import { TSelectableCollectionItem } from '@soldy/core'
import { SelectableCollectionItemContribution } from '../../../../contributions/components/collection/selectable'
import { CollectionItemDescriptor } from '../collection-item.descriptor'

export const SelectableCollectionItemDescriptor = defineComponent({
	ctor: TSelectableCollectionItem,

	extends: CollectionItemDescriptor,

	contribution: SelectableCollectionItemContribution,
})
