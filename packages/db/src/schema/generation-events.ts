import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { generationStatusEnum } from "./enums.js";
import { generations } from "./generations.js";

export const generationEvents = pgTable(
  "generation_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    generationId: uuid("generation_id")
      .notNull()
      .references(() => generations.id, { onDelete: "cascade" }),
    status: generationStatusEnum("status").notNull(),
    message: text("message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("generation_events_generation_id_idx").on(table.generationId),
  ],
);
