/**
 * Имена поверхности: пропсы — общим правилом, события — `so:` и полное имя
 * ядра, у каждого события (`so:show`, `so:show:before`): событие всплывает в
 * общий канал DOM, и префикс говорит, чьё оно.
 */

import type { INamingStrategy } from '@soldy-ui/setup'
import { underscorePropNaming } from '@soldy-ui/setup'

const EVENT_PREFIX = 'so:'

export const WebcNaming: INamingStrategy = {
	prop: underscorePropNaming,

	event: (name) => EVENT_PREFIX + name.getName(),
}
