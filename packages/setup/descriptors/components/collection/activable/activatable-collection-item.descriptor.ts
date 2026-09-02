/**
 * Дескриптор ActivatableCollectionItem (TActivatableCollectionItem).
 */

import { defineComponent } from '../../../base'
import { TActivatableCollectionItem } from '@soldy/core'
import { ActivatableCollectionItemContribution } from '../../../../contributions/components/collection/activable'
import { CollectionItemDescriptor } from '../collection-item.descriptor'

export const ActivatableCollectionItemDescriptor = defineComponent({
	ctor: TActivatableCollectionItem,

	extends: CollectionItemDescriptor,

	contribution: ActivatableCollectionItemContribution,
})
