// A module of parts: `withParts` hangs the part on the owner, and React is only behind the
// imports. A server module — on the server the owner and the part are references, and the
// reference of the part hangs on the reference of the owner
import { withParts } from '@soldy-ui/setup'
import { Button } from './button'
import { Item } from './item'

export const List = withParts(Button, { Item })
