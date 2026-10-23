/**
 * Слой лифта — неизменяемая карта «ключ → значение» от предков, один
 * контекст React на все ключи. AGENTS.md (React), «Срок жизни контекста».
 */

import { createContext } from 'react'

export type TElevatorLayer = ReadonlyMap<symbol, unknown>

const EMPTY_LAYER: TElevatorLayer = new Map()

export const ElevatorContext = createContext<TElevatorLayer>(EMPTY_LAYER)
