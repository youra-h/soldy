/**
 * Control — слой disabled/focused.
 */

import type { IControl, IControlProps, TControlEvents } from '@soldy/core'
import type { TReactComponentProps } from '../../types'
import type { ReactEventProps, TElementEventProps } from '../../adapter'

/** События слоя Control (core-события + element-плагин), выведены автоматически. */
export type TControlEventProps = ReactEventProps<TControlEvents> & TElementEventProps

export type ControlProps = TReactComponentProps<IControlProps, IControl> & TControlEventProps
