import { serve } from 'https://deno.land/std@0.175.0/http/server.ts'
import { Pool } from 'https://deno.land/x/postgres@v0.17.0/mod.ts'
import {
  Kysely,
  Generated,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
} from 'https://esm.sh/kysely@0.23.4'

//TODO: translate these node imports and their usages to Deno
import bodyParser from "body-parser";
import cors from "cors";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Either from "effect/Either";
import * as Exit from "effect/Exit";
import { flow } from "effect/Function";
import * as Match from "effect/Match";
import path from "path";

import { PostgresDriver } from './DenoPostgresDriver.ts'
import { Server, ServerLive } from "../Server.ts";
import { Database, Db } from "../Types.ts";

console.log(`Function "kysely-postgres" up and running!`)

interface AnimalTable {
  id: Generated<bigint>
  animal: string
  created_at: Date
}

// Keys of this interface are table names.
interface Database {
  animals: AnimalTable
}

// Create a database pool with one connection.
const pool = new Pool(
  {
    tls: { caCertificates: [Deno.env.get('DB_SSL_CERT')!] },
    database: 'postgres',
    hostname: Deno.env.get('DB_HOSTNAME'),
    user: 'postgres',
    port: 5432,
    password: Deno.env.get('DB_PASSWORD'),
  },
  1
)

const db = new Kysely<Database>({
  dialect: {
    createAdapter() {
      return new PostgresAdapter()
    },
    createDriver() {
      return new PostgresDriver({ pool })
    },
    createIntrospector(db: Kysely<unknown>) {
      return new PostgresIntrospector(db)
    },
    createQueryCompiler() {
      return new PostgresQueryCompiler()
    },
  },
})

serve(async (req) => {
  Effect.runCallback(server.sync(req.body as Uint8Array), {
      onExit: Exit.match({
        onFailure: flow(
          Cause.failureOrCause,
          Either.match({
            onLeft: flow(
              Match.value,
              Match.tagsExhaustive({
                BadRequestError: ({ error }) => {
                  res.status(400).send(JSON.stringify(error));
                },
              }),
            ),
            onRight: (error) => {
              // eslint-disable-next-line no-console
              console.log(error);
              res.status(500);
            },
          }),
        ),
        onSuccess: (buffer) => {
          res.setHeader("Content-Type", "application/octet-stream");
          res.send(buffer);
        },
      }),
    });
})
