/**
 * Stylable — слой size/variant.
 */

import type {
	IStylable,
	IStylableProps,
	TComponentSize,
	TComponentVariant,
	TValuePayload,
} from '@soldy/core'
import type { TComponentViewEventProps } from '../component-view'
import type { TReactComponentProps } from '../../types'

/** События слоя Stylable. */
export type TStylableEventProps = TComponentViewEventProps & {
	onChangeSize?: (payload: TValuePayload<TComponentSize>) => void
	onChangeVariant?: (payload: TValuePayload<TComponentVariant>) => void
}

export type StylableProps = TReactComponentProps<IStylableProps, IStylable> &
	TStylableEventProps
