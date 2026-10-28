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
 * The core name of a journal event: a part's event comes under the part's name
 * (`Tabs.Item>action:press`, see `partsOf` of the playground), and the rules
 * apply to it as to the component's own.
 */
const coreName = (event) => event.name.slice(event.name.indexOf('>') + 1)

/**
 * Comparison rules — differences of the adapters' API and of the frameworks'
 * lifecycle, not of the component's behavior. They apply to the parts' events
 * too (`coreName`).
 *
 * - `vModel` — `update:<prop>` are v-model events of Vue; the other adapters
 *   have no v-model and do not send them.
 * - `ids` — ids and list keys are compared by presence only, see `masked`.
 * - `single` — an output of Angular and a `CustomEvent` of Web Components
 *   carry one value, see `packed`.
 * - `removedBlur` — the blur of the removed node in the unmount step of
 *   Svelte, Web Components and Angular, see `TEARDOWN`.
 * - `nodeOrder` — the events of a node (`ready`, `element:ready`,
 *   `element:removed`) are compared by content, not by place, see `NODE`.
 * - `enteredBefore` — the `change:order` of a part in React's mount step, see
 *   `ENTERED`.
 */
const RULES = {
	vModel: (event) => !coreName(event).startsWith('update:'),
	single: new Set(['webc', 'angular']),
	removedBlur: new Set(['svelte', 'webc', 'angular']),
	nodeOrder: new Set(['react', 'svelte', 'solid', 'webc']),
	enteredBefore: new Set(['react']),
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
}

/**
 * The unmount step, compared by its events: the consumer hears nothing once
 * the teardown began. Vue (`onBeforeUnmount`), React, Angular and Solid
 * unsubscribe it before the children and the nodes go, Svelte — in a
 * pre-effect, made before the template's blocks, and a removed custom element
 * or Angular component sends nothing. A collection's items stop with it
 * (`detach` of the adapter context): the siblings leaving one by one are not
 * heard. Svelte, Web Components and Angular remove the nodes before any hook of
 * the component, though, and Chrome blurs a removed focused node before it is
 * detached: the focused component's `action:blur` and `change:focused`
 * reach the consumer there (`removedBlur`).
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

const BLUR = new Set(['action:blur', 'change:focused'])

/**
 * Events of a node — of the component's and of its parts': the frame of
 * `TElementPlugin` after binding, and the unbinding. They come in the order
 * the framework binds and unbinds nodes, not in the order of the core's
 * events: Vue, React and Angular bind the children first, Svelte, Solid and
 * Web Components the parent first, and Solid takes a node out on the write
 * that hides it, while Vue does it on its render after the click. Such a
 * framework's node events are compared as a set (`nodeOrder`), and the
 * rest of the step in order.
 */
const NODE = new Set(['ready', 'element:ready', 'element:removed'])

/**
 * React renders all the items of a list before it commits any, and an item's
 * facade follows its collection from its render: an item that has not entered
 * yet hears `change:order` as its earlier siblings enter. Vue makes and
 * accepts the items one by one, and an item hears only the later ones. A
 * part's `change:order` in the mount step is not compared for React
 * (`enteredBefore`).
 */
const ENTERED = 'mount'

/** Events of their step under the rules of the framework, in the order they are compared. */
function eventsOf(step, fw) {
	const { label } = step
	let events = step.events

	if (label === TEARDOWN && RULES.removedBlur.has(fw)) {
		events = events.filter((event) => !BLUR.has(coreName(event)))
	}

	if (label === ENTERED && RULES.enteredBefore.has(fw)) {
		events = events.filter((event) => !event.name.includes('>change:order'))
	}

	if (RULES.nodeOrder.has(fw)) {
		const node = events.filter((event) => NODE.has(coreName(event)))

		events = [
			...events.filter((event) => !NODE.has(coreName(event))),
			...node.sort((a, b) => (text(a) < text(b) ? -1 : text(a) > text(b) ? 1 : 0)),
		]
	}

	return events
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
	const ours = eventsOf(
		{
			label: vue.label,
			events: vue.events.filter(RULES.vModel).map((event) => packed(event, fw)),
		},
		fw,
	)
	const expected = ours.map(text)
	const actual = eventsOf(other, fw).map(text)

	if (expected.join('\n') !== actual.join('\n')) {
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
const totals = { pages: 0, steps: 0, events: 0 }
const summary = []

for (const page of Object.values(vue.pages)) {
	totals.pages++
	totals.steps += page.steps.length
	totals.events += page.steps.reduce(
		(sum, step) => sum + step.events.filter(RULES.vModel).length,
		0,
	)
}

// The reference itself must run clean: an error on a Vue page is a finding too
const own = Object.entries(vue.pages).filter(([, page]) => page.errors.length)

if (own.length) {
	report.push(`## vue: errors on ${own.length} pages`, '')

	for (const [id, page] of own) report.push(`### ${id}`, '', '```', ...page.errors, '```', '')
}

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

			if (step.label !== theirStep.label) return

			const found = compareStep(step, theirStep, fw)

			if (found.length) divergences.push({ id, step: `${index} ${step.label}`, found })
		})
	}

	const pages = new Set(divergences.map((divergence) => divergence.id))

	summary.push({
		fw,
		divergences: divergences.length,
		pages: pages.size,
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
	'| Framework | Steps differ | Pages |',
	'| --- | --- | --- |',
	...summary.map(({ fw, divergences, pages }) => `| ${fw} | ${divergences} | ${pages} |`),
	'',
)

const out = values.out ?? path.join(results, 'parity-report.md')

fs.writeFileSync(out, report.join('\n'))
console.log(report.slice(0, 8 + summary.length).join('\n'))
process.exitCode = summary.filter((row) => row.divergences).length + (own.length ? 1 : 0)
