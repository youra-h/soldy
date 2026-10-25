import type { TRec } from '../data'
import { TanstackTable } from './TanstackTable'

export const sel = { selectAll: 'thead input[type="checkbox"]', sort: 'thead th[data-col="name"]' }

/** TanStack Table v9 с нативными чекбоксами. */
export function Bench(props: { rows: TRec[] }) {
	return <TanstackTable rows={props.rows} kobalte={false} />
}
