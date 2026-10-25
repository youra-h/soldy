import type { TRec } from '../data'

/** Строки страницы Svelte — их пишет сценарий, читает `Host`. */
export const page = $state<{ rows: TRec[] | null }>({ rows: null })
