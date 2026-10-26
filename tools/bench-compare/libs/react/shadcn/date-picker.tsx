import { useState } from 'react'
import { ChevronDownIcon } from 'lucide-react'
import { Button } from './ui/button'
import { Calendar } from './ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'

/**
 * A date field with a calendar in a popup — shadcn's Date Picker: a button
 * opens `Calendar` (react-day-picker) in a `Popover`, a pick closes it. As in
 * the docs.
 */
export default function Page() {
	const [open, setOpen] = useState(false)
	const [date, setDate] = useState<Date | undefined>(undefined)

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					aria-label="Дата"
					className="w-48 justify-between font-normal"
				>
					{date ? date.toLocaleDateString() : 'Дата'}
					<ChevronDownIcon />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto overflow-hidden p-0" align="start">
				<Calendar
					mode="single"
					selected={date}
					onSelect={(next) => {
						setDate(next)
						setOpen(false)
					}}
				/>
			</PopoverContent>
		</Popover>
	)
}
