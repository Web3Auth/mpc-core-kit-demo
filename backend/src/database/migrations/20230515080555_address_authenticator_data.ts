import { Knex } from "knex";

import { ADDRESS_AUTHENTICATOR_DATA, AUTHENTICATOR_VERIFIED_STATUS } from "../../utils/constants";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable(ADDRESS_AUTHENTICATOR_DATA, (table) => {
    table.bigIncrements("id");
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
    table.string("address").notNullable();
    table.string("secretKey").notNullable();
    table.text("data", "mediumtext").nullable();
    table.string("deleted").defaultTo("false");
    table.enum("status", Object.values(AUTHENTICATOR_VERIFIED_STATUS)).defaultTo(AUTHENTICATOR_VERIFIED_STATUS.PENDING);

    table.unique(["address"], { indexName: "address_unique_idx" });
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists(ADDRESS_AUTHENTICATOR_DATA);
}
