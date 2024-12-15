import {
    boolean,
    foreignKey,
    integer,
    pgTable,
    serial,
    text,
    timestamp,
} from "drizzle-orm/pg-core";

export const dinosaurs = pgTable("dinosaurs", {
    id: serial().primaryKey().notNull(),
    name: text(),
    description: text(),
});

export const tasks = pgTable("tasks", {
    id: serial().primaryKey().notNull(),
    dinosaur_id: integer("dinosaur_id"),
    description: text(),
    date_created: timestamp("date_created", { mode: "string" }).defaultNow(),
    is_complete: boolean("is_complete"),
}, (table) => {
    return {
        tasksDinosaurIdFkey: foreignKey({
            columns: [table.dinosaur_id],
            foreignColumns: [dinosaurs.id],
            name: "tasks_dinosaur_id_fkey",
        }),
    };
});
