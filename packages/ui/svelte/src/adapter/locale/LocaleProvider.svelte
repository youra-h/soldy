<script lang="ts">
	import { untrack } from 'svelte'
	import { TLocaleSource } from '@soldy-ui/plugins'
	import { provideLocale } from './context'
	import type { TLocaleProviderProps } from './types'

	const props: TLocaleProviderProps = $props()

	// С локалью первой отрисовки — имена нужны и на сервере; дальше — эффект
	const source = new TLocaleSource(untrack(() => props.locale))

	provideLocale(source)

	// Тем же проходом, что и разметка; компоненты не перемонтируются
	$effect.pre(() => {
		source.locale = props.locale
	})
</script>

<!-- Локаль поддерева: источник у провайдера свой, вложенный даёт поддереву свой. -->
{@render props.children?.()}
