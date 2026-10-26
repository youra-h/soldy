<script lang="ts">
	import { ComboBox } from 'carbon-components-svelte'
	import { COLLECTION_ITEMS } from '../../../data'

	/**
	 * Select with typing and filtering — `ComboBox`, as the soldy `editable`
	 * preview. It does not filter by default: the filter is `shouldFilterItem`,
	 * as its documentation shows.
	 */
	const items = COLLECTION_ITEMS.map((item) => ({ id: item.value, text: item.text }))

	function shouldFilterItem(item: { text: string }, value: string): boolean {
		return !value || item.text.toLowerCase().includes(value.toLowerCase())
	}
</script>

<ComboBox placeholder="Выберите" {items} {shouldFilterItem} />
