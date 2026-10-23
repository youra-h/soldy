import type { IAdapterProfile } from '@soldy-ui/setup'
import { SvelteNaming } from './naming'

export const SvelteProfile: IAdapterProfile = { naming: SvelteNaming, defaultSlot: 'children' }
