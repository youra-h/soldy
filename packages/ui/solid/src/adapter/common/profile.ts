import { batch } from 'solid-js'
import type { IAdapterProfile } from '@soldy-ui/setup'
import { SolidNaming } from './naming'

/**
 * Profile of the binding (`adapter.connect()`): the names, the default slot
 * `children` and `batch`. Solid applies a signal write at once, rendering
 * included; inside `batch` an update of the exchange renders after its event,
 * so the consumer hears the event before what it renders, as on the other
 * platforms. AGENTS.md (Solid), «Связка».
 */
export const SolidProfile: IAdapterProfile = { naming: SolidNaming, defaultSlot: 'children', batch }
