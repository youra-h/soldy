import type { TRec } from '../data'
import { TanstackTable } from './TanstackTable'

// Kobalte прячет нативный `<input type="checkbox">` внутри своего чекбокса и
// переключается по его `change`: клик сценария — по нему
export const sel = { selectAll: 'thead input[type="checkbox"]', sort: 'thead th[data-col="name"]' }

/** Data Table solid-ui — TanStack Table v9 и `Checkbox` Kobalte. */
export function Bench(props: { rows: TRec[] }) {
	return <TanstackTable rows={props.rows} kobalte={true} />
}
