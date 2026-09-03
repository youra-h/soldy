/**
 * Control — слой disabled/focused.
 */

import type { IControl, IControlProps } from '@soldy/core'
import type { TStylableEventProps } from '../stylable'
import type { TReactComponentProps } from '../../types'

/** События слоя Control. */
export type TControlEventProps = TStylableEventProps & {
	onChangeDisabled?: (value: boolean) => void
	onChangeFocused?: (value: boolean) => void
}

export type ControlProps = TReactComponentProps<IControlProps, IControl> & TControlEventProps
