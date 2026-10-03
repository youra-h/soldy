import type { IDateInput } from '@soldy-ui/core'
import type { TPluginEvents } from '../../../base'

/**
 * Своих событий у плагина нет: результат клавиши виден в ядре — в частях,
 * значении и части под фокусом.
 */
export type TDateInputKeyboardPluginEvents = TPluginEvents

/** Клавиша части — команда ядра для части под фокусом. */
export type TDateInputKeyCommand = (owner: IDateInput) => void
