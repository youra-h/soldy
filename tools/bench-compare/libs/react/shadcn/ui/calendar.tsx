import { useEffect, useRef, type ComponentProps } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { DayButton, DayPicker, getDefaultClassNames } from 'react-day-picker'
import { Button, buttonVariants } from './button'
import { cn } from './utils'

/** shadcn/ui `components/ui/calendar.tsx` (new-york-v4): DayPicker with shadcn's classes. */
export function Calendar({
	className,
	classNames,
	showOutsideDays = true,
	...props
}: ComponentProps<typeof DayPicker>) {
	const defaults = getDefaultClassNames()

	return (
		<DayPicker
			showOutsideDays={showOutsideDays}
			className={cn(
				'bg-background group/calendar p-3 [--cell-size:--spacing(8)]',
				String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
				String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
				className,
			)}
			classNames={{
				root: cn('w-fit', defaults.root),
				months: cn('flex gap-4 flex-col md:flex-row relative', defaults.months),
				month: cn('flex flex-col w-full gap-4', defaults.month),
				nav: cn(
					'flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between',
					defaults.nav,
				),
				button_previous: cn(
					buttonVariants({ variant: 'ghost' }),
					'size-(--cell-size) aria-disabled:opacity-50 p-0 select-none',
					defaults.button_previous,
				),
				button_next: cn(
					buttonVariants({ variant: 'ghost' }),
					'size-(--cell-size) aria-disabled:opacity-50 p-0 select-none',
					defaults.button_next,
				),
				month_caption: cn(
					'flex items-center justify-center h-(--cell-size) w-full px-(--cell-size)',
					defaults.month_caption,
				),
				caption_label: cn('select-none font-medium text-sm', defaults.caption_label),
				month_grid: 'w-full border-collapse',
				weekdays: cn('flex', defaults.weekdays),
				weekday: cn(
					'text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] select-none',
					defaults.weekday,
				),
				week: cn('flex w-full mt-2', defaults.week),
				day: cn(
					'relative w-full h-full p-0 text-center [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md group/day aspect-square select-none',
					defaults.day,
				),
				today: cn(
					'bg-accent text-accent-foreground rounded-md data-[selected=true]:rounded-none',
					defaults.today,
				),
				outside: cn(
					'text-muted-foreground aria-selected:text-muted-foreground',
					defaults.outside,
				),
				disabled: cn('text-muted-foreground opacity-50', defaults.disabled),
				hidden: cn('invisible', defaults.hidden),
				...classNames,
			}}
			components={{
				Chevron: ({ className, orientation, ...props }) =>
					orientation === 'left' ? (
						<ChevronLeftIcon className={cn('size-4', className)} {...props} />
					) : (
						<ChevronRightIcon className={cn('size-4', className)} {...props} />
					),
				DayButton: CalendarDayButton,
			}}
			{...props}
		/>
	)
}

function CalendarDayButton({
	className,
	day,
	modifiers,
	...props
}: ComponentProps<typeof DayButton>) {
	const defaults = getDefaultClassNames()
	const ref = useRef<HTMLButtonElement>(null)

	useEffect(() => {
		if (modifiers.focused) ref.current?.focus()
	}, [modifiers.focused])

	return (
		<Button
			ref={ref}
			variant="ghost"
			size="icon"
			data-day={day.date.toLocaleDateString()}
			data-selected-single={modifiers.selected}
			className={cn(
				'data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring/50 flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px] [&>span]:text-xs [&>span]:opacity-70',
				defaults.day,
				className,
			)}
			{...props}
		/>
	)
}
