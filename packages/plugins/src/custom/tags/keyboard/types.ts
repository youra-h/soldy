import type { TPluginEvents } from '../../../base'

/**
 * Своих событий у плагина нет: результат нажатия виден и так — фокус сообщает
 * DOM, остановку Tab — набор `aria` тегов, закрытие — коллекция (`item:close`).
 */
export type TTagsKeyboardPluginEvents = TPluginEvents
