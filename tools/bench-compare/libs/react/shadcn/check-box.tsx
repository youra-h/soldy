import { useId } from 'react'
import { Checkbox } from './ui/checkbox'
import { Label } from './ui/label'

/** A checkbox with its label, as shadcn's docs pair them (`htmlFor`). */
export default function Page() {
	const id = useId()

	return (
		<div className="flex items-center gap-3">
			<Checkbox id={id} />
			<Label htmlFor={id}>Согласен</Label>
		</div>
	)
}
