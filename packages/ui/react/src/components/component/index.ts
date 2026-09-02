/**
 * Component — headless-слой TComponent (rendered/visible/events).
 *
 * В отличие от Vue здесь нет «extends»-цепочки: базовые слои экспортируются
 * как типы props и хуки, на которых строятся конкретные компоненты.
 */

import type { IComponent, IComponentProps, TActionEvent } from '@soldy/core'
import type { TReactComponentProps } from '../../types'

/** События слоя Component (колбэки-пропсы React). */
export type TComponentEventProps = {
	onShow?: () => void
	onHide?: () => void
	onShowBefore?: (e: TActionEvent) => void
	onShowAfter?: () => void
	onHideBefore?: (e: TActionEvent) => void
	onHideAfter?: () => void
	onChangeRendered?: (value: boolean) => void
	onChangeVisible?: (value: boolean) => void
	onChangePresent?: (value: boolean) => void
}

export type ComponentProps = TReactComponentProps<IComponentProps, IComponent> &
	TComponentEventProps
