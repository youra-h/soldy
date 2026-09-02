/**
 * Stylable — слой size/variant.
 */

import { StylableDescriptor } from '@soldy/setup'
import type {
	IStylable,
	IStylableProps,
	TComponentSize,
	TComponentVariant,
	TValuePayload,
} from '@soldy/core'
import { useComponent } from '../../adapter'
import type { TComponentBinding } from '../../adapter'
import type { TComponentViewEventProps } from '../component-view'
import type { TReactComponentProps } from '../../types'

/** События слоя Stylable. */
export type TStylableEventProps = TComponentViewEventProps & {
	onChangeSize?: (payload: TValuePayload<TComponentSize>) => void
	onChangeVariant?: (payload: TValuePayload<TComponentVariant>) => void
}

export type StylableProps = TReactComponentProps<IStylableProps, IStylable> &
	TStylableEventProps

/** Хук слоя Stylable. */
export function useStylable(props: StylableProps): TComponentBinding<IStylable> {
	return useComponent<IStylableProps, IStylable>(StylableDescriptor, props)
}
