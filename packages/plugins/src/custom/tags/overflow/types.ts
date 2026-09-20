import type { TPluginEvents } from '../../../base'

/**
 * Своих событий у плагина нет: результат замера виден через коллекцию —
 * расширение `overflow` отдаёт `fitted` и `overflowed`, и о смене состава
 * сообщает оно (`change:fit`).
 */
export type TTagsOverflowPluginEvents = TPluginEvents
