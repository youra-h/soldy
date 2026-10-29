<script module lang="ts">
	import { useIcons, useTheme } from '@soldy-ui/setup'
	import * as material from '@soldy-ui/icons-material'
	import oren from '@soldy-ui/theme-oren/setup'

	import '@soldy-ui/theme-oren'

	// The registries are global: filled once per process, on the server too,
	// not once per request
	useIcons(material)
	useTheme(oren)
</script>

<script lang="ts">
	import type { LayoutProps } from './$types'

	let { children }: LayoutProps = $props()
</script>

{@render children()}
