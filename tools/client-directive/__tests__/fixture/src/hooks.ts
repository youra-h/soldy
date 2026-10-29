// A hook: imports React itself
import { useState } from 'react'

export function useCount(): number {
	return useState(0)[0]
}
