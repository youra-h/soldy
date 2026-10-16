import type { TPluginEvents } from '../../../base'

/**
 * Своих событий у плагина нет: куда ушёл фокус, сообщает DOM, а листание —
 * значение пагинации.
 */
export type TPaginationFocusPluginEvents = TPluginEvents

/** Стрелка пагинации — часть разметки владельца `__prev` или `__next`. */
export type TPaginationArrow = 'prev' | 'next'
