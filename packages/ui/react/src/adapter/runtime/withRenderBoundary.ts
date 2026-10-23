/**
 * withRenderBoundary — граница перерисовки (`memo`): родитель перерисовывает
 * компонент, только когда сменился проп по идентичности. AGENTS.md (React),
 * «Связка и состояние».
 */

import { memo } from 'react'
import type { FunctionComponent, NamedExoticComponent } from 'react'

export function withRenderBoundary<TProps extends object>(
	component: FunctionComponent<TProps>,
): NamedExoticComponent<TProps> {
	return memo(component)
}
