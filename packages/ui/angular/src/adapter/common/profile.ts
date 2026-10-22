import type { IAdapterProfile } from '@soldy-ui/setup'
import { AngularNaming } from './naming'

/** Профиль Angular — одна поверхность на кодоген и связку монтирования. */
export const AngularProfile: IAdapterProfile = { naming: AngularNaming }
