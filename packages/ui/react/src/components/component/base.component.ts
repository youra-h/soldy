/**
 * Component — headless-слой TComponent (rendered/visible/events).
 *
 * В отличие от Vue здесь нет «extends»-цепочки: базовые слои экспортируются
 * как типы props и хуки, на которых строятся конкретные компоненты.
 */

import type { IComponent, IComponentProps, TComponentEvents } from '@soldy/core'
import type { TReactComponentProps } from '../../types'
import type { ReactEventProps } from '../../adapter'

/** События слоя Component (колбэки-пропсы React), выведены из TComponentEvents. */
export type TComponentEventProps = ReactEventProps<TComponentEvents>

export type ComponentProps = TReactComponentProps<IComponentProps, IComponent> &
	TComponentEventProps
