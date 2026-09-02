/**
 * Control — слой disabled/focused.
 */

import { ControlDescriptor } from '@soldy/setup'
import type { IControl, IControlProps } from '@soldy/core'
import { useComponent } from '../../adapter'
import type { TComponentBinding } from '../../adapter'
import type { TStylableEventProps } from '../stylable'
import type { TReactComponentProps } from '../../types'

/** События слоя Control. */
export type TControlEventProps = TStylableEventProps & {
	onChangeDisabled?: (value: boolean) => void
	onChangeFocused?: (value: boolean) => void
}

export type ControlProps = TReactComponentProps<IControlProps, IControl> & TControlEventProps

/** Хук слоя Control. */
export function useControl(props: ControlProps): TComponentBinding<IControl> {
	return useComponent<IControlProps, IControl>(ControlDescriptor, props)
}
