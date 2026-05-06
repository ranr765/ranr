import { Hono } from 'hono'
import liquidityPlaybookHtml from './liquidity-playbook.html?raw'

const app = new Hono()

app.get('/', (c) => c.html(liquidityPlaybookHtml))

export default app
