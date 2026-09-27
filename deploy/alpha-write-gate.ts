import type { Client } from 'pg';

export async function setAlphaWriteGate(client: Client, installed: boolean) {
  await client.query('BEGIN');
  try {
    if (installed)
      await client.query(`
        CREATE OR REPLACE FUNCTION public.quizmon_alpha_reject_progress_write()
        RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          RAISE EXCEPTION 'Quizmon progress writes are paused for migration.';
        END
        $$
      `);
    for (const table of ['player', 'round']) {
      await client.query(
        `DROP TRIGGER IF EXISTS quizmon_alpha_progress_write_gate ON public.${table}`,
      );
      if (installed)
        await client.query(`
          CREATE TRIGGER quizmon_alpha_progress_write_gate
          BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.${table}
          FOR EACH STATEMENT EXECUTE FUNCTION public.quizmon_alpha_reject_progress_write()
        `);
    }
    if (!installed)
      await client.query(
        'DROP FUNCTION IF EXISTS public.quizmon_alpha_reject_progress_write()',
      );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

export async function assertAlphaWriteGate(client: Client) {
  const gate = await client.query<{ table_name: string }>(`
    SELECT c.relname AS table_name
    FROM pg_trigger AS t
    JOIN pg_class AS c ON c.oid = t.tgrelid
    WHERE t.tgname = 'quizmon_alpha_progress_write_gate'
      AND t.tgfoid = 'public.quizmon_alpha_reject_progress_write()'::regprocedure
      AND t.tgenabled IN ('O', 'A')
      AND t.tgrelid IN ('public.player'::regclass, 'public.round'::regclass)
  `);
  if (new Set(gate.rows.map((row) => row.table_name)).size !== 2)
    throw new Error('The source write gate is not installed.');
}
