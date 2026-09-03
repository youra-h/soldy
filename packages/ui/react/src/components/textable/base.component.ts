/**
 * Textable — слой text.
 */

import type { ITextable, ITextableProps, TTextableEvents } from '@soldy/core'
import type { TReactComponentProps } from '../../types'
import type { ReactEventProps, TElementEventProps } from '../../adapter'

/** События слоя Textable (core-события + element-плагин), выведены автоматически. */
export type TTextableEventProps = ReactEventProps<TTextableEvents> & TElementEventProps

export type TextableProps = TReactComponentProps<ITextableProps, ITextable> & TTextableEventProps
