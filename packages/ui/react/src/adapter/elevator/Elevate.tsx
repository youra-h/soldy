/**
 * Elevate — отдаёт детям слой лифта компонента (`layer` сборки): аналог
 * `provide` у Vue. AGENTS.md (React), «Срок жизни контекста».
 */

import type { ReactNode } from 'react'
import { ElevatorContext, type TElevatorLayer } from './layer'

export type TElevateProps = {
	layer: TElevatorLayer
	children?: ReactNode
}

export function Elevate({ layer, children }: TElevateProps): ReactNode {
	return <ElevatorContext value={layer}>{children}</ElevatorContext>
}

/**
 * Содержимое слота под слоем лифта; пустой слот — как есть, чтобы встало
 * запасное. Так контрол поля отдаёт слой только слотам, без лишних узлов.
 */
export function elevated(layer: TElevatorLayer, content: ReactNode): ReactNode {
	return content === undefined ? undefined : <Elevate layer={layer}>{content}</Elevate>
}
