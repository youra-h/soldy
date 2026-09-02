/**
 * Textable — слой text.
 */

import { TextableDescriptor } from '@soldy/setup'
import type { ITextable, ITextableProps, TValuePayload } from '@soldy/core'
import { useComponent } from '../../adapter'
import type { TComponentBinding } from '../../adapter'
import type { TControlEventProps } from '../control'
import type { TReactComponentProps } from '../../types'

/** События слоя Textable. */
export type TTextableEventProps = TControlEventProps & {
	onChangeText?: (payload: TValuePayload<string>) => void
}

export type TextableProps = TReactComponentProps<ITextableProps, ITextable> & TTextableEventProps

/** Хук слоя Textable. */
export function useTextable(props: TextableProps): TComponentBinding<ITextable> {
	return useComponent<ITextableProps, ITextable>(TextableDescriptor, props)
}
