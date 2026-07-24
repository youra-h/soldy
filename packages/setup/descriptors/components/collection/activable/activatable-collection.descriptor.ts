/**
 * Дескриптор ActivatableCollection (TActivatableCollection).
 */

import { defineComponent } from '../../../base'
import { TActivatableCollection } from '@soldy/core'
import { ActivatableCollectionContribution } from '../../../../contributions/components/collection/activable'
import { CollectionDescriptor } from '../collection.descriptor'

export const ActivatableCollectionDescriptor = defineComponent({
	ctor: TActivatableCollection,

	extends: CollectionDescriptor,

	contribution: ActivatableCollectionContribution,
})
