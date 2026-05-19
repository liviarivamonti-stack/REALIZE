#!/bin/bash
export DATABASE_URL="postgresql://postgres:@12DEJUNHO123@db.hcolufjlzcrnppvlihvs.supabase.co:5432/postgres"
pnpm --filter @workspace/db run push
