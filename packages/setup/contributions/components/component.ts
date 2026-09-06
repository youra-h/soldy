import type { IContribution } from '@soldy/accessor'

/**
 * TComponent — невизуальная база. Ни props, ни событий отображения:
 * видимость объявлена в ComponentViewContribution.
 */
export const ComponentContribution = (): IContribution => ({})
