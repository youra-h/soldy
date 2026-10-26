import { useState } from 'react'
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react'
import { COLLECTION_ITEMS } from '../../../data'
import { Button } from './ui/button'
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from './ui/command'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { cn } from './ui/utils'

/**
 * Select with typing and filtering. shadcn's `Select` has no typing; the
 * searchable one its docs give is the Combobox — `Popover` with a `Command`
 * list (cmdk) and the search field inside the panel. As in the docs.
 */
export default function Page() {
	const [open, setOpen] = useState(false)
	const [value, setValue] = useState('')
	const selected = COLLECTION_ITEMS.find((item) => item.value === value)

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className="w-60 justify-between"
				>
					{selected ? selected.text : 'Выберите'}
					<ChevronsUpDownIcon className="opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-60 p-0">
				<Command>
					<CommandInput placeholder="Поиск" className="h-9" />
					<CommandList>
						<CommandEmpty>Ничего не найдено</CommandEmpty>
						<CommandGroup>
							{COLLECTION_ITEMS.map((item) => (
								<CommandItem
									key={item.value}
									value={item.text}
									onSelect={() => {
										setValue(item.value === value ? '' : item.value)
										setOpen(false)
									}}
								>
									{item.text}
									<CheckIcon
										className={cn(
											'ml-auto',
											value === item.value ? 'opacity-100' : 'opacity-0',
										)}
									/>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	)
}
