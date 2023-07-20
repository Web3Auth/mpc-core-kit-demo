import { Knex, knex } from "knex";
import knexTinyLogger from "knex-tiny-logger";

import createLogger from "../utils/createLogger";
import config from "./knexfile";

const log = createLogger("knex.ts");
const env = process.env.NODE_ENV;
let dbConfig1 = config.development;
let dbConfig2 = config.development;

if (env === "production") {
  dbConfig1 = config.productionRead;
  dbConfig2 = config.productionWrite;
}

export const knexRead =
  env === "production"
    ? (knex(dbConfig1) as Knex<Record<string, string>, unknown[]>)
    : (knexTinyLogger(knex(dbConfig1), {
        bindings: false,
        logger: log.debug,
      }) as Knex<Record<string, string>, unknown[]>);
export const knexWrite =
  env === "production"
    ? (knex(dbConfig2) as Knex<Record<string, string>, unknown[]>)
    : (knexTinyLogger(knex(dbConfig2), {
        bindings: false,
        logger: log.debug,
      }) as Knex<Record<string, string>, unknown[]>);
