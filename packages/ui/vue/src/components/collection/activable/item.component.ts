import { useEmits, useProps } from '../../../adapter'
import type { TEmits, TProps } from '../../../types/common'
import { ActivatableCollectionItemDescriptor } from '@soldy/setup'
import {
	BaseCollectionItem,
	propsCollectionItem,
} from '../item'

export const emitsActivatableCollectionItem: TEmits = useEmits(ActivatableCollectionItemDescriptor) as unknown as TEmits

export const propsActivatableCollectionItem: TProps = {
	...propsCollectionItem,
	...useProps(ActivatableCollectionItemDescriptor),
} as TProps

export default {
	name: 'BaseActivatableCollectionItem',
	extends: BaseCollectionItem,
	emits: emitsActivatableCollectionItem,
	props: propsActivatableCollectionItem,
}
