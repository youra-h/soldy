/**
 * Имена Angular: пропсы — общим правилом, выходы — `so` и полное имя события
 * ядра в camelCase (`show:before` → `soShowBefore`), у всех событий. Выходы
 * делят шаблон с событиями DOM, а `on` руководство Angular запрещает.
 * AGENTS.md (Angular), «Каждый выход — с префиксом `so`».
 */

import type { INamingStrategy } from '@soldy-ui/setup'
import { underscorePropNaming } from '@soldy-ui/setup'

const OUTPUT_PREFIX = 'so'

function capitalize(word: string): string {
	return word.charAt(0).toUpperCase() + word.slice(1)
}

function toOutputName(fullName: string): string {
	return OUTPUT_PREFIX + fullName.split(/[-:]/).filter(Boolean).map(capitalize).join('')
}

export const AngularNaming: INamingStrategy = {
	prop: underscorePropNaming,

	event: (name) => toOutputName(name.getName()),
}
