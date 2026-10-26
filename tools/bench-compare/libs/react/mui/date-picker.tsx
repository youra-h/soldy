import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'

/**
 * A date field with a calendar in a popup. The adapter provider belongs to
 * the application root; here it wraps each copy so that the other pages of the
 * library do not carry the date library.
 */
export default function Page() {
	return (
		<LocalizationProvider dateAdapter={AdapterDayjs}>
			<DatePicker label="Дата" />
		</LocalizationProvider>
	)
}
