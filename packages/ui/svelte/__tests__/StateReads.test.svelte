<script lang="ts">
	/**
	 * Test harness: effects that read the binding state of a button by name.
	 *
	 * Each entry of `reads` is one effect that reads its names in one run and
	 * reports the run to `onRun` with the values it read. Template effects read
	 * the state the same way, so the effects stand for markup.
	 */
	import type { TButton } from '@soldy-ui/core'
	import { ButtonDescriptor } from '@soldy-ui/setup'
	import { createSvelteAdapterContext, useAdapter } from '@soldy-ui/svelte'

	type THarnessProps = {
		ctrl: TButton
		reads: readonly (readonly string[])[]
		onRun: (effect: number, values: unknown[]) => void
	}

	const props: THarnessProps = $props()
	const mountId = $props.id()
	const getProps = () => ({ ctrl: props.ctrl })
	const reads = () => props.reads
	const binding = useAdapter(
		createSvelteAdapterContext(ButtonDescriptor(), {
			ctrl: getProps().ctrl,
			props: getProps(),
			mountId,
		}),
		getProps,
	)

	reads().forEach((names, effect) => {
		$effect(() => {
			props.onRun(
				effect,
				names.map((name) => Reflect.get(binding.state, name)),
			)
		})
	})
</script>
