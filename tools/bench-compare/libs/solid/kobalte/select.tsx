import { Combobox } from '@kobalte/core/combobox'
import { COLLECTION_ITEMS } from '../../../data'

/**
 * Select with typing and filtering — `Combobox`, as the soldy `editable`
 * preview: the options filter by the typed text (Kobalte's default
 * «contains»), the arrow opens the list.
 */
export default function Page() {
	return (
		<Combobox
			class="kb-combobox"
			options={[...COLLECTION_ITEMS]}
			optionValue="value"
			optionTextValue="text"
			optionLabel="text"
			placeholder="Выберите"
			itemComponent={(props) => (
				<Combobox.Item item={props.item}>
					<Combobox.ItemLabel>{props.item.rawValue.text}</Combobox.ItemLabel>
					<Combobox.ItemIndicator>✓</Combobox.ItemIndicator>
				</Combobox.Item>
			)}
		>
			<Combobox.Control aria-label="Выберите">
				<Combobox.Input />
				<Combobox.Trigger>▾</Combobox.Trigger>
			</Combobox.Control>
			<Combobox.Portal>
				<Combobox.Content class="kb-combobox-content">
					<Combobox.Listbox />
				</Combobox.Content>
			</Combobox.Portal>
		</Combobox>
	)
}
