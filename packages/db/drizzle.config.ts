import { defineConfig } from 'drizzle-kit'
import 'dotenv/config'

const url = process.env['DATABASE_URL']
if (!url) throw new Error('DATABASE_URL is not set')

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: { url },
  verbose: true,
  strict: true,
})
