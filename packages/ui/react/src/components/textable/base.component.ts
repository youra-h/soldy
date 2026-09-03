/**
 * Textable — слой text.
 */

import type { ITextable, ITextableProps, TValuePayload } from '@soldy/core'
import type { TControlEventProps } from '../control'
import type { TReactComponentProps } from '../../types'

/** События слоя Textable. */
export type TTextableEventProps = TControlEventProps & {
	onChangeText?: (payload: TValuePayload<string>) => void
}

export type TextableProps = TReactComponentProps<ITextableProps, ITextable> & TTextableEventProps
