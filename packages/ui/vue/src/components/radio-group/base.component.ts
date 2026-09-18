import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { RadioGroupDescriptor, RadioGroupCollectionDescriptor } from '@soldy/setup'
import type { IRadioGroup } from '@soldy/core'

export const emitsRadioGroup: TEmits = [
	...useEmits(RadioGroupDescriptor()),
	...useEmits(RadioGroupCollectionDescriptor()),
]

export const propsRadioGroup: TProps = {
	...(useProps(RadioGroupDescriptor()) as TProps),
	...(useProps(RadioGroupCollectionDescriptor()) as TProps),
}

export type RadioGroupProps = UseProps<typeof RadioGroupDescriptor, IRadioGroup>

export default {
	name: 'BaseRadioGroup',
	emits: emitsRadioGroup,
	props: propsRadioGroup,
}
