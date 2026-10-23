/** Профиль React для связки (`adapter.connect()`): имена и слот по умолчанию. */

import type { IAdapterProfile } from '@soldy-ui/setup'
import { ReactNaming } from './naming'

export const ReactProfile: IAdapterProfile = { naming: ReactNaming, defaultSlot: 'children' }
