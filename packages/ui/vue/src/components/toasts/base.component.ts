import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { ToastsDescriptor, ToastsCollectionDescriptor } from '@soldy-ui/setup'
import type { IToasts } from '@soldy-ui/core'

export const emitsToasts: TEmits = [
	...useEmits(ToastsDescriptor()),
	...useEmits(ToastsCollectionDescriptor()),
]

export const propsToasts: TProps = {
	...(useProps(ToastsDescriptor()) as TProps),
	...(useProps(ToastsCollectionDescriptor()) as TProps),
}

export type ToastsProps = UseProps<typeof ToastsDescriptor, IToasts>

export default {
	name: 'BaseToasts',
	emits: emitsToasts,
	props: propsToasts,
}
