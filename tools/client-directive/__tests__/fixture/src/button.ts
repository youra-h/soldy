// A component: renders with React and calls a hook of the build
import { createElement } from 'react'
import { useCount } from './hooks'
import { toClass } from './helpers'

export function Button() {
	return createElement('button', { className: toClass('button') }, useCount())
}
