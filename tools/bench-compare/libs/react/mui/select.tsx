import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import { COLLECTION_ITEMS } from '../../../data'

/** Select with typing and filtering — `Autocomplete`, as the soldy `editable` preview. */
export default function Page() {
	return (
		<Autocomplete
			options={COLLECTION_ITEMS}
			getOptionLabel={(item) => item.text}
			renderInput={(params) => <TextField {...params} placeholder="Выберите" />}
			sx={{ width: 240 }}
		/>
	)
}
