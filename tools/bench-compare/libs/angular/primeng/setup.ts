import Aura from '@primeuix/themes/aura'
import { providePrimeNG } from 'primeng/config'

/** PrimeNG as the application sets it up: the Aura theme preset, styles injected by the library. */
export const providers = [providePrimeNG({ theme: { preset: Aura } })]
