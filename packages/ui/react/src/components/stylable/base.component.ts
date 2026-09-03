/**
 * Stylable — слой size/variant.
 */

import type { IStylable, IStylableProps, TStylableEvents } from '@soldy/core'
import type { TReactComponentProps } from '../../types'
import type { ReactEventProps, TElementEventProps } from '../../adapter'

/** События слоя Stylable (core-события + element-плагин), выведены автоматически. */
export type TStylableEventProps = ReactEventProps<TStylableEvents> & TElementEventProps

export type StylableProps = TReactComponentProps<IStylableProps, IStylable> &
	TStylableEventProps
