import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'

/**
 * Parity report: the journals of `parity.mjs` compared with Vue's (see
 * benchmarks/parity/README.md).
 *
 *   node parity-report.mjs                 # results/parity-report.md
 *   node parity-report.mjs --fw react,webc
 *
 * For every page and every step: the step labels (the scenario did the same),
 * the events (names, arguments, order), the ARIA snapshot and the focused
 * node. The expected differences are comparison rules (`RULES` and the
 * functions it names), each with its reason, not exceptions: a difference that
 * no rule explains is a defect. The exit code is the number of frameworks with
 * divergences (Vue counts for its own errors).
 */
const { values } = parseArgs({
	options: {
		fw: { type: 'string', default: 'react,svelte,solid,webc,angular' },
		out: { type: 'string' },
	},
})
const results = path.resolve(import.meta.dirname, 'results')
const read = (fw) => JSON.parse(fs.readFileSync(path.join(results, `parity-${fw}.json`), 'utf8'))

/**
 * Comparison rules — differences of the adapters' API and of the frameworks'
 * lifecycle, not of the component's behavior.
 *
 * - `vModel` — `update:<prop>` are v-model events of Vue; the other adapters
 *   have no v-model and do not send them.
 * - `ids` — ids and list keys are compared by presence only, see `masked`.
 * - `single` — an output of Angular and a `CustomEvent` of Web Components
 *   carry one value, see `packed`.
 * - `assembly` — what the component's own assembly sends, see `assembled`.
 * - `syncRender` — Solid renders on a state write, see `rendered`.
 * - `delegated` — a framework handler runs at the root, see `delegated`.
 * - `teardown` — what a component sends while its framework takes it down
 *   is not compared: the unmount step's events are only counted, see
 *   `TEARDOWN`.
 */
const RULES = {
	vModel: (event) => !event.name.startsWith('update:'),
	single: new Set(['webc', 'angular']),
	ids: new Set([
		'id',
		'for',
		'aria-controls',
		'aria-labelledby',
		'aria-describedby',
		'aria-activedescendant',
		'aria-owns',
		'aria-errormessage',
		'data-owner',
		'key',
	]),
	assembly: new Set(['react', 'angular']),
	syncRender: new Set(['solid']),
	delegated: new Set(['react', 'svelte', 'solid']),
}

/**
 * The teardown: Vue (`onBeforeUnmount`), React and Angular unsubscribe the
 * consumer before the children and the nodes go, and a removed custom element
 * sends nothing. Svelte removes the nodes first and destroys the children
 * before the parent, and Solid cleans the children before the parent: the
 * blur of the removed node, the root's unbinding, the markup items leaving
 * the collection reach the consumer there, and neither framework has a hook
 * that comes earlier. Chrome blurs a removed node before it is detached, so a
 * custom element hears its own blur too.
 */
const TEARDOWN = 'unmount'

/**
 * Ids are built from the mount id (`useId` of React, the app prefix of Vue, the
 * build counter of Angular) and differ by construction; list keys (`key` of a
 * section or a drawn entry) come from a page-wide counter and depend on how
 * many instances the page built before. Under such a key a value is compared
 * by presence only. The tree compares what the ids link — names and
 * descriptions.
 */
function masked(value) {
	if (Array.isArray(value)) return value.map(masked)
	if (value === null || typeof value !== 'object') return value

	return Object.fromEntries(
		Object.entries(value).map(([key, field]) => [
			key,
			RULES.ids.has(key) && field !== null && typeof field !== 'object'
				? '<id>'
				: masked(field),
		]),
	)
}

/**
 * Vue's event in the form of the framework's payload: an event of several
 * arguments comes as their array, of none — as `undefined` (`null` in
 * `detail`, as the platform fills it). A custom element extends only an HTML
 * element, so the root of Icon in Web Components is a `span` with the picture
 * inside, not the `svg` itself: the node of `element:ready`.
 */
function packed(event, fw) {
	if (fw === 'webc' && event.name === 'element:ready' && event.args[0]?.node === 'svg') {
		return packed({ name: event.name, args: [{ node: 'span' }] }, fw)
	}

	if (!RULES.single.has(fw)) return event

	const { args } = event
	const none = fw === 'webc' ? null : '<undefined>'

	return { name: event.name, args: [args.length > 1 ? args : (args[0] ?? none)] }
}

/**
 * The mount step without the component's own assembly, for the frameworks
 * that listen after it. A collection component has two contexts — its own
 * and the collection facade's, — and the facade's assembly writes into the
 * owner: the months of Calendar's grids, Table's `dataset`. React builds both
 * in one factory of the render and listens at the commit, Angular — after
 * `ngOnInit` built both: that is the initial state there. Vue, Svelte, Solid
 * and Web Components listen to the owner before they build the facade, and
 * it comes as events. The assembly's events are those before anything else
 * happened: before the first item joined and before the plugins' bundle.
 */
function assembled(events, fw, label) {
	if (label !== 'mount' || !RULES.assembly.has(fw)) return events

	const first = events.findIndex(
		(event) => event.name === 'item:add:before' || event.name === 'bundle:create',
	)

	return first > 0 ? events.slice(first) : events
}

/**
 * Solid applies a state write at once, rendering included: the panel that
 * `change:open` opens mounts and its items join the collection before the
 * event reaches the consumer (the exchange rereads the state first and sends
 * the event after). The other frameworks render later. Accepted: the same
 * events where exactly one of Vue's comes later in Solid's journal.
 */
function rendered(expected, actual, fw) {
	if (!RULES.syncRender.has(fw) || expected.length !== actual.length) return false

	return expected.some((line, index) => {
		const rest = expected.filter((_, other) => other !== index)

		return actual.some(
			(their, at) =>
				at > index &&
				their === line &&
				actual.filter((_, other) => other !== at).join('\n') === rest.join('\n'),
		)
	})
}

/** The owner's own reaction to a click, past the click's target. */
const PRESS = /^action:(click|press) /

/**
 * React, Svelte and Solid delegate a handler of the markup (`onClick` of an
 * item's row: activate the tab, choose the option, turn the page) to the root
 * of the document or the app, so it runs after the native listeners of the
 * ancestors — the owner's `action:click` and `action:press` come before what
 * the item's click does. Vue's `@click` listens on the node itself. A native
 * listener in place of the handler (`onActionClick`) would not hear a click
 * before the first frame — `TActionPlugin` takes the node with `ready`.
 * Accepted: the same events where only the owner's click and press moved.
 */
function delegated(expected, actual, fw) {
	if (!RULES.delegated.has(fw)) return false

	const rest = (lines) => lines.filter((line) => !PRESS.test(line)).join('\n')

	return (
		rest(expected) === rest(actual) && [...expected].sort().join() === [...actual].sort().join()
	)
}

const text = (event) => `${event.name} ${JSON.stringify(masked(event.args))}`

/** Longest common subsequence of two line lists — the diff of two snapshots. */
function diff(a, b) {
	const n = a.length
	const m = b.length
	const table = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))

	for (let i = n - 1; i >= 0; i--) {
		for (let j = m - 1; j >= 0; j--) {
			table[i][j] =
				a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1])
		}
	}

	const lines = []
	let i = 0
	let j = 0

	while (i < n && j < m) {
		if (a[i] === b[j]) {
			i++
			j++
		} else if (table[i + 1][j] >= table[i][j + 1]) lines.push(`- ${a[i++]}`)
		else lines.push(`+ ${b[j++]}`)
	}

	while (i < n) lines.push(`- ${a[i++]}`)
	while (j < m) lines.push(`+ ${b[j++]}`)

	return lines
}

/** Divergences of one step: events, tree, focus. */
function compareStep(vue, other, fw) {
	const found = []
	const ours = assembled(vue.events.filter(RULES.vModel), fw, vue.label)
	const expected = ours.map((event) => text(packed(event, fw)))
	const actual = other.events.map(text)

	if (
		expected.join('\n') !== actual.join('\n') &&
		!rendered(expected, actual, fw) &&
		!delegated(expected, actual, fw)
	) {
		const same = [...expected].sort().join('\n') === [...actual].sort().join('\n')

		found.push({ kind: same ? 'order' : 'events', lines: diff(expected, actual) })
	}

	if (vue.aria !== other.aria) {
		found.push({ kind: 'aria', lines: diff(vue.aria.split('\n'), other.aria.split('\n')) })
	}

	if (JSON.stringify(vue.focus) !== JSON.stringify(other.focus)) {
		found.push({
			kind: 'focus',
			lines: [`- ${JSON.stringify(vue.focus)}`, `+ ${JSON.stringify(other.focus)}`],
		})
	}

	return found
}

const vue = read('vue')
const frameworks = values.fw.split(',')

/**
 * The comparison checks itself first, as the page run its planted leak: a
 * step of Vue with its events reversed and a line added to its tree is found
 * twice — the order and the tree. A comparison that sees no difference there
 * would report every platform clean.
 */
function selfCheck() {
	const probe = Object.values(vue.pages)
		.flatMap((page) => page.steps)
		.find((step) => step.aria && new Set(step.events.map(text)).size >= 2)

	if (!probe) throw new Error('[parity] no step to check the comparison on')

	const planted = {
		...probe,
		events: [...probe.events].filter(RULES.vModel).reverse(),
		aria: `${probe.aria}\n- planted`,
	}
	const kinds = compareStep(probe, planted, 'self').map((found) => found.kind)

	if (!kinds.includes('aria') || !kinds.some((kind) => kind === 'order' || kind === 'events')) {
		throw new Error(`[parity] the comparison missed a planted difference: ${kinds.join(', ')}`)
	}
}

selfCheck()
const report = [`# Parity — ${new Date().toISOString().slice(0, 10)}`, '']
const compared = (step) => step.label !== TEARDOWN
const totals = { pages: 0, steps: 0, events: 0 }
const summary = []

for (const page of Object.values(vue.pages)) {
	const steps = page.steps.filter(compared)

	totals.pages++
	totals.steps += steps.length
	totals.events += steps.reduce((sum, step) => sum + step.events.filter(RULES.vModel).length, 0)
}

// The reference itself must run clean: an error on a Vue page is a finding too
const own = Object.entries(vue.pages).filter(([, page]) => page.errors.length)

if (own.length) {
	report.push(`## vue: errors on ${own.length} pages`, '')

	for (const [id, page] of own) report.push(`### ${id}`, '', '```', ...page.errors, '```', '')
}

/** Events of the unmount steps — counted, not compared (`TEARDOWN`). */
const teardownOf = (journal) =>
	Object.values(journal.pages).reduce(
		(sum, page) =>
			sum +
			(page.steps.find((step) => step.label === TEARDOWN)?.events.filter(RULES.vModel)
				.length ?? 0),
		0,
	)

for (const fw of frameworks) {
	const other = read(fw)
	const divergences = []

	for (const [id, page] of Object.entries(vue.pages)) {
		const theirs = other.pages[id]

		if (!theirs) {
			divergences.push({ id, step: '—', found: [{ kind: 'page', lines: ['no page'] }] })
			continue
		}

		if (theirs.errors.length) {
			divergences.push({ id, step: '—', found: [{ kind: 'errors', lines: theirs.errors }] })
		}

		const labels = page.steps.map((step) => step.label)
		const their = theirs.steps.map((step) => step.label)

		if (labels.join('\n') !== their.join('\n')) {
			divergences.push({
				id,
				step: '—',
				found: [{ kind: 'steps', lines: diff(labels, their) }],
			})
		}

		page.steps.slice(0, theirs.steps.length).forEach((step, index) => {
			const theirStep = theirs.steps[index]

			if (!compared(step) || step.label !== theirStep.label) return

			const found = compareStep(step, theirStep, fw)

			if (found.length) divergences.push({ id, step: `${index} ${step.label}`, found })
		})
	}

	const pages = new Set(divergences.map((divergence) => divergence.id))

	summary.push({
		fw,
		divergences: divergences.length,
		pages: pages.size,
		teardown: teardownOf(other),
	})
	report.push(`## ${fw}: ${divergences.length} steps differ on ${pages.size} pages`, '')

	for (const { id, step, found } of divergences) {
		for (const { kind, lines } of found) {
			report.push(
				`### ${id} · ${step} · ${kind}`,
				'',
				'```diff',
				...lines.slice(0, 40),
				'```',
				'',
			)
		}
	}
}

report.splice(
	2,
	0,
	`Compared with Vue: ${totals.pages} pages, ${totals.steps} steps, ${totals.events} events.`,
	'',
	'| Framework | Steps differ | Pages | Teardown events (not compared) |',
	'| --- | --- | --- | --- |',
	`| vue | — | — | ${teardownOf(vue)} |`,
	...summary.map(
		({ fw, divergences, pages, teardown }) =>
			`| ${fw} | ${divergences} | ${pages} | ${teardown} |`,
	),
	'',
)

const out = values.out ?? path.join(results, 'parity-report.md')

fs.writeFileSync(out, report.join('\n'))
console.log(report.slice(0, 9 + summary.length).join('\n'))
process.exitCode = summary.filter((row) => row.divergences).length + (own.length ? 1 : 0)
