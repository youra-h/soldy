// services/custom/collection/types.ts

import type { TCollection } from '@soldy/core'

export type TCollectionServiceEvents<T> = {
    'ready': (collection: TCollection<T, any>) => void
}
