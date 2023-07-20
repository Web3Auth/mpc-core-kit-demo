import { Knex } from "knex";

import { ADDRESS_NUMBER_DATA, NUMBER_VERIFIED_STATUS } from "../../utils/constants";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable(ADDRESS_NUMBER_DATA, (table) => {
    table.bigIncrements("id");
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
    table.string("address").notNullable();
    table.string("number").notNullable();
    table.text("data", "mediumText").nullable();
    table.enum("status", Object.values(NUMBER_VERIFIED_STATUS)).defaultTo(NUMBER_VERIFIED_STATUS.PENDING);

    table.unique(["address"], { indexName: "address_unique_idx" });
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists(ADDRESS_NUMBER_DATA);
}
