import type { IContribution } from '@soldy/accessor'

/** Meta-расширение не экспортирует собственных props/events наружу — это внутренний процесс. */
export const MetaExtensionContribution = (): IContribution => ({})
