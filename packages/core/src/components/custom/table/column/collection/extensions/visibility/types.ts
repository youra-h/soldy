import type { TNoEvents } from '../../../../../../../common'

/**
 * Событий у расширения нет — см. `TNoEvents`. Что выборка устарела,
 * сообщает движок (`items:query:invalidated`), а читатель перечитывает
 * `batch.shown`.
 */
export type TTableColumnsVisibilityEvents = TNoEvents
