import type { IEntity } from '@soldy/core'
import type { IComponentDescriptor, DescriptorComponentProps } from '@soldy/setup'

export type TEmits = readonly string[]
export type TProps = Readonly<Record<string, unknown>>

/** Props компонента, выведенные из дескриптора: UseProps<typeof ButtonDescriptor, IButton> → ButtonProps */
export type UseProps<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TInstance extends IEntity = IEntity,
> = DescriptorComponentProps<TDescriptorFn, TInstance>
