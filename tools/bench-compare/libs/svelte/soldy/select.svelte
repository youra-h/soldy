<script lang="ts">
	import { Select } from '@soldy-ui/svelte'
	import { COLLECTION_ITEMS } from '../../../data'
</script>

<Select placeholder="Выберите" editable items={COLLECTION_ITEMS} />
