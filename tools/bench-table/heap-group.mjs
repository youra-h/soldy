/**
 * Heap snapshot by groups — shared by the table stand (`heap.mjs` here) and
 * the component page stand (`tools/bench-pages/heap.mjs`). A group is the
 * constructor of an object, the function name of a closure or the node type;
 * plain objects (`Object`) have no name, and the set of their properties
 * serves as the group. Besides the plain groups:
 *
 * - `@ owner → node .edge` — internal nodes (arrays, closure contexts,
 *   property stores) by their first strong owner;
 * - `# host` — the whole JS heap by the nearest dominating host: a soldy class,
 *   a Vue instance or node, a DOM element — like retained size, without
 *   overlaps;
 * - `% host :: node` — what each host consists of;
 * - `__JS__` — the JS heap in total.
 */

/** Self size and node count by group, and the name of every node. */
export function group(snap) {
	const m = snap.snapshot.meta
	const nf = m.node_fields.length
	const ef = m.edge_fields.length
	const nodeTypes = m.node_types[0]
	const edgeTypes = m.edge_types[0]
	const [iType, iName, iSize, iEdges] = ['type', 'name', 'self_size', 'edge_count'].map((k) =>
		m.node_fields.indexOf(k),
	)
	const [eType, eName] = ['type', 'name_or_index'].map((k) => m.edge_fields.indexOf(k))
	const { nodes, edges, strings } = snap
	// Where a closure is declared: its line in the unminified build (`dist-prof`)
	const where = new Map()
	if (snap.locations) {
		const lf = m.location_fields.length
		const [lNode, lLine] = ['object_index', 'line'].map((k) => m.location_fields.indexOf(k))
		for (let i = 0; i < snap.locations.length; i += lf)
			where.set(snap.locations[i + lNode], snap.locations[i + lLine] + 1)
	}
	const iTo = m.edge_fields.indexOf('to_node')
	// The first strong owner of a node: by it internal nodes (arrays, closure
	// contexts, property stores) are assigned to their object
	const owner = new Int32Array(nodes.length / nf).fill(-1)
	const ownerEdge = new Int32Array(nodes.length / nf)
	{
		let e2 = 0
		for (let n = 0; n < nodes.length; n += nf) {
			const c = nodes[n + iEdges]
			for (let k = 0; k < c; k++, e2 += ef) {
				const t = edgeTypes[edges[e2 + eType]]
				if (t === 'weak' || t === 'shortcut') continue
				const to = edges[e2 + iTo] / nf
				if (owner[to] === -1) {
					owner[to] = n / nf
					ownerEdge[to] = t === 'element' || t === 'hidden' ? -1 : edges[e2 + eName]
				}
			}
		}
	}
	const names = new Array(nodes.length / nf)
	const out = new Map()
	let e = 0
	for (let n = 0; n < nodes.length; n += nf) {
		const type = nodeTypes[nodes[n + iType]]
		const count = nodes[n + iEdges]
		let name = strings[nodes[n + iName]]
		if (type === 'object' && name === 'Object') {
			const props = []
			for (let k = 0; k < count && props.length < 7; k++) {
				const at = e + k * ef
				if (edgeTypes[edges[at + eType]] === 'property')
					props.push(strings[edges[at + eName]])
			}
			name = `{${props.join(',')}}`
		} else if (type === 'closure')
			name = `ƒ ${name || '(anon)'}${where.has(n) ? ' :' + where.get(n) : ''}`
		else if (type !== 'object')
			name = `(${type}) ${type === 'string' || type === 'number' ? '' : name}`.trim()
		name = name.replace(/ @\d+$/, '')
		names[n / nf] = name
		const g = out.get(name) ?? { size: 0, count: 0 }
		g.size += nodes[n + iSize]
		g.count++
		out.set(name, g)
		e += count * ef
	}
	// Internal nodes go to their owner, up to the first non-internal one
	const internal = (i) =>
		/^\((array|hidden|code|object shape)\)|^system \/|^\(native\) system \//.test(names[i])
	const byOwner = new Map()
	let jsSize = 0
	for (let i = 0; i < names.length; i++) {
		const nt = nodeTypes[nodes[i * nf + iType]]
		if (nt === 'native' && !names[i].startsWith('(native) system')) continue
		jsSize += nodes[i * nf + iSize]
		if (!internal(i)) continue
		let o = owner[i],
			via = ownerEdge[i],
			hops = 0
		while (o >= 0 && internal(o) && hops++ < 8) {
			via = ownerEdge[o]
			o = owner[o]
		}
		const key =
			(o >= 0 ? names[o] : '?') + ' → ' + names[i] + (via >= 0 ? ' .' + strings[via] : '')
		const g = byOwner.get(key) ?? { size: 0, count: 0 }
		g.size += nodes[i * nf + iSize]
		g.count++
		byOwner.set(key, g)
	}
	// Dominator tree (Cooper–Harvey–Kennedy): every node goes to its nearest
	// dominating host — a soldy class, a Vue instance or node, a DOM element.
	// So the whole weight is split without overlaps, like retained size
	const count = nodes.length / nf
	const first = new Uint32Array(count + 1)
	for (let i = 0; i < count; i++) first[i + 1] = first[i] + nodes[i * nf + iEdges]
	const strong = (k) => {
		const t = edgeTypes[edges[k * ef + eType]]
		return t !== 'weak' && t !== 'shortcut'
	}
	const post = new Int32Array(count).fill(-1)
	const order = new Int32Array(count)
	let p = 0
	{
		const stack = new Int32Array(count)
		const cursor = new Uint32Array(count)
		const seen = new Uint8Array(count)
		let sp = 0
		stack[sp++] = 0
		seen[0] = 1
		cursor[0] = first[0]
		while (sp) {
			const v = stack[sp - 1]
			if (cursor[v] < first[v + 1]) {
				const k = cursor[v]++
				if (!strong(k)) continue
				const w = edges[k * ef + iTo] / nf
				if (seen[w]) continue
				seen[w] = 1
				cursor[w] = first[w]
				stack[sp++] = w
			} else {
				sp--
				post[v] = p
				order[p++] = v
			}
		}
	}
	const predFirst = new Uint32Array(count + 1)
	for (let v = 0; v < count; v++)
		for (let k = first[v]; k < first[v + 1]; k++)
			if (strong(k)) predFirst[edges[k * ef + iTo] / nf + 1]++
	for (let i = 0; i < count; i++) predFirst[i + 1] += predFirst[i]
	const preds = new Int32Array(predFirst[count])
	{
		const fill = predFirst.slice()
		for (let v = 0; v < count; v++)
			for (let k = first[v]; k < first[v + 1]; k++)
				if (strong(k)) preds[fill[edges[k * ef + iTo] / nf]++] = v
	}
	const idom = new Int32Array(count).fill(-1)
	idom[0] = 0
	const reached = order.subarray(0, p)
	const intersect = (a, b) => {
		while (a !== b) {
			while (post[a] < post[b]) a = idom[a]
			while (post[b] < post[a]) b = idom[b]
		}
		return a
	}
	for (let changed = true; changed;) {
		changed = false
		for (let i = reached.length - 1; i >= 0; i--) {
			const v = reached[i]
			if (v === 0 || post[v] < 0) continue
			let d = -1
			for (let k = predFirst[v]; k < predFirst[v + 1]; k++) {
				const u = preds[k]
				if (post[u] < 0 || idom[u] === -1) continue
				d = d === -1 ? u : intersect(u, d)
			}
			if (d !== -1 && idom[v] !== d) {
				idom[v] = d
				changed = true
			}
		}
	}
	const host = (name) =>
		/^T[A-Z]\w*(\$\d+)?$/.test(name) ||
		/^(Dep|Link|ReactiveEffect|RefImpl|ComputedRefImpl|EffectScope)$/.test(name) ||
		name.startsWith('{uid,vnode,') ||
		name.startsWith('{__v_isVNode') ||
		(name.startsWith('(native) <') && !name.startsWith('(native) <html'))
	const hostOf = new Int32Array(count).fill(-2)
	const findHost = (v) => {
		const path = []
		let h = -1
		while (v > 0 && post[v] >= 0) {
			if (hostOf[v] !== -2) {
				h = hostOf[v]
				break
			}
			path.push(v)
			if (host(names[v])) {
				h = v
				break
			}
			v = idom[v]
		}
		for (const p of path) hostOf[p] = h
		return h
	}
	const hostKey = (h) =>
		h < 0 ? '(вне хозяев)' : names[h].startsWith('(native) <') ? '(DOM-элемент)' : names[h]
	for (let i = 0; i < count; i++) {
		if (post[i] < 0) continue
		const nt = nodeTypes[nodes[i * nf + iType]]
		if (nt === 'native' && !names[i].startsWith('(native) system')) continue
		let h = findHost(i)
		let shared = ''
		// A shared node (held by two, its dominator is above the hosts) goes to
		// the host of its first holder: approximate, marked «~»
		if (h < 0) {
			let o = owner[i]
			for (let hops = 0; o > 0 && hops < 12; hops++, o = owner[o]) {
				if (host(names[o])) {
					h = o
					shared = '~ '
					break
				}
			}
		}
		const key = '# ' + shared + hostKey(h)
		const g = out.get(key) ?? { size: 0, count: 0 }
		g.size += nodes[i * nf + iSize]
		if (h === i) g.count++
		out.set(key, g)
		const inner = '% ' + shared + hostKey(h) + ' :: ' + names[i]
		const gi = out.get(inner) ?? { size: 0, count: 0 }
		gi.size += nodes[i * nf + iSize]
		gi.count++
		out.set(inner, gi)
	}
	out.set('__JS__', { size: jsSize, count: 0 })
	for (const [k, v] of byOwner) out.set('@ ' + k, v)
	return { groups: out, names }
}
