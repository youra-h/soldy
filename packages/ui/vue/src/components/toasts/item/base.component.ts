import { useEmits, useProps } from '../../../adapter'
import type { TEmits, TProps, UseProps } from '../../../types/common'
import { ToastsItemDescriptor, ToastsCollectionItemDescriptor } from '@soldy-ui/setup'
import type { IToastsItem } from '@soldy-ui/core'

export const emitsToastsItem: TEmits = [
	...useEmits(ToastsItemDescriptor()),
	...useEmits(ToastsCollectionItemDescriptor()),
]

export const propsToastsItem: TProps = {
	...(useProps(ToastsItemDescriptor()) as TProps),
	...(useProps(ToastsCollectionItemDescriptor()) as TProps),
}

export type ToastsItemProps = UseProps<typeof ToastsItemDescriptor, IToastsItem>

export default {
	name: 'BaseToastsItem',
	emits: emitsToastsItem,
	props: propsToastsItem,
}
