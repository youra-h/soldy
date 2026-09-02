/**
 * Дескриптор SelectableCollection (TSelectableCollection).
 */

import { defineComponent } from '../../../base'
import { TSelectableCollection } from '@soldy/core'
import { SelectableCollectionContribution } from '../../../../contributions/components/collection/selectable'
import { CollectionDescriptor } from '../collection.descriptor'

export const SelectableCollectionDescriptor = defineComponent({
	ctor: TSelectableCollection,

	extends: CollectionDescriptor,

	contribution: SelectableCollectionContribution,
})
