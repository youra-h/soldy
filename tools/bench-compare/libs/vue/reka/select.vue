<script setup lang="ts">
import {
	ComboboxAnchor,
	ComboboxContent,
	ComboboxInput,
	ComboboxItem,
	ComboboxPortal,
	ComboboxRoot,
	ComboboxTrigger,
	ComboboxViewport,
} from 'reka-ui'
import { COLLECTION_ITEMS } from '../../../data'

/**
 * Select with typing and filtering — `Combobox`, as the soldy `editable`
 * preview; it filters the items by their text itself.
 */
defineOptions({ name: 'RekaSelectPage' })

type TItem = (typeof COLLECTION_ITEMS)[number]

const text = (item: unknown) =>
	COLLECTION_ITEMS.find((found: TItem) => found.value === item)?.text ?? ''
</script>

<template>
	<ComboboxRoot>
		<ComboboxAnchor style="display: inline-flex; border: 1px solid">
			<ComboboxInput placeholder="Выберите" :display-value="text" />
			<ComboboxTrigger>▾</ComboboxTrigger>
		</ComboboxAnchor>
		<ComboboxPortal>
			<ComboboxContent position="popper" style="background: white; border: 1px solid">
				<ComboboxViewport>
					<ComboboxItem
						v-for="item in COLLECTION_ITEMS"
						:key="item.value"
						:value="item.value"
					>
						{{ item.text }}
					</ComboboxItem>
				</ComboboxViewport>
			</ComboboxContent>
		</ComboboxPortal>
	</ComboboxRoot>
</template>
