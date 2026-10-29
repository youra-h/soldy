// Parts on an owner the module wraps first, as `withRenderBoundary(Impl)` would: a call of a
// function of a client module next to `withParts`. On the server that function is a reference,
// and a reference throws when called — so a client module
import { withParts } from '@soldy-ui/setup'
import { bounded } from './boundary'
import { Button } from './button'
import { Item } from './item'

export const Menu = withParts(bounded(Button), { Item })
