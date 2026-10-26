import { useId } from 'react'
import { Label } from './ui/label'
import { Switch } from './ui/switch'

/** A switch with its label, as shadcn's docs pair them (`htmlFor`). */
export default function Page() {
	const id = useId()

	return (
		<div className="flex items-center gap-2">
			<Switch id={id} />
			<Label htmlFor={id}>Включено</Label>
		</div>
	)
}
