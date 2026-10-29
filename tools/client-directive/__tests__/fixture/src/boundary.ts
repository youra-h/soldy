// A wrapper of a component, as `withRenderBoundary` of the adapter: imports React itself
import { memo } from 'react'
import type { FunctionComponent } from 'react'

export function bounded(component: FunctionComponent) {
	return memo(component)
}
