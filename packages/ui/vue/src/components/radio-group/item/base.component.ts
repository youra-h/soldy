import { useEmits, useProps } from '../../../adapter'
import type { TEmits, TProps, UseProps } from '../../../types/common'
import { RadioGroupItemDescriptor, RadioGroupCollectionItemDescriptor } from '@soldy/setup'
import type { IRadioGroupItem } from '@soldy/core'

export const emitsRadioGroupItem: TEmits = [
	...useEmits(RadioGroupItemDescriptor()),
	...useEmits(RadioGroupCollectionItemDescriptor()),
]

export const propsRadioGroupItem: TProps = {
	...(useProps(RadioGroupItemDescriptor()) as TProps),
	...(useProps(RadioGroupCollectionItemDescriptor()) as TProps),
}

export type RadioGroupItemProps = UseProps<typeof RadioGroupItemDescriptor, IRadioGroupItem>

export default {
	name: 'BaseRadioGroupItem',
	emits: emitsRadioGroupItem,
	props: propsRadioGroupItem,
}
