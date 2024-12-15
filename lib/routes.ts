import * as path from "path";
import * as log from "@std/log";
import type { T_Http_Route_Request } from "@/lib/http.ts";

export type T_Route_Handler = {
    default: (req: T_Http_Route_Request) => Uint8Array;
};
type T_Route_Handlers = { [key: string]: T_Route_Handler };

export type T_Route = ReturnType<typeof find_route>;

const find_route = (
    query: string,
    route_keys: string[],
    route_handlers: T_Route_Handlers,
) => {
    for (
        let route_index = 0;
        route_index < route_keys.length;
        route_index++
    ) {
        const route_entries = route_keys[route_index].split("/");
        const query_entries = query.split("/");
        const params: { [key: string]: string } = {};

        for (let i = 0; i < route_entries.length; i++) {
            if (typeof query_entries[i] !== "string") {
                continue;
            }

            const entry = route_entries[i];
            const handler = {
                index: route_index,
                key: route_keys[route_index],
                handler: route_handlers[route_keys[route_index]],
                params,
            };
            let ok = false;

            if (entry.startsWith("[") && entry.endsWith("]")) {
                const param_name = entry.substring(1, entry.length - 1);
                params[param_name] = query_entries[i];
                ok = true;
            }

            if (
                entry === query_entries[i] && route_entries[i + 1] &&
                route_entries[i + 1].startsWith("[") &&
                route_entries[i + 1].endsWith("]")
            ) {
                return handler;
            }

            if (entry === query_entries[i]) {
                ok = true;
            }

            if (entry === query_entries[i].split("?")[0]) {
                ok = true;
            }

            if (ok && i === route_entries.length - 1) {
                return handler;
            }

            if (ok) {
                continue;
            }

            break;
        }
    }
};

export const import_routes = async (routes_dir: string) => {
    const cwd = Deno.cwd();
    const route_handlers: T_Route_Handlers = {};

    const walk = async (
        dir: string,
        dir_friendly?: string,
        first_dir?: string,
    ) => {
        if (!first_dir) {
            first_dir = dir;
        }

        if (!dir_friendly) {
            dir_friendly = dir;
        }

        for await (const entry of Deno.readDir(path.join(cwd, dir))) {
            const full_target_path = path.join(dir, entry.name);
            const full_friendly_path = `${dir_friendly}/${entry.name}`;

            if (entry.isDirectory) {
                await walk(full_target_path, full_friendly_path, first_dir);
                continue;
            }

            if (full_friendly_path === `${dir_friendly}/404.ts`) {
                log.debug("Skipping import of special route file 404.ts");

                continue;
            }

            let import_path = path.join(cwd, full_target_path);
            if (Deno.build.os === "windows") {
                // for some reason this is required on windows
                import_path = `file://${import_path}`;
            }

            const handler = await import(import_path);
            if (!handler) {
                log.warn(`Could not resolve import for ${full_target_path}`);

                continue;
            }

            let full_route_path = full_friendly_path.substring(
                first_dir.length,
            );
            if (
                full_route_path.startsWith("/index.ts") &&
                full_route_path.endsWith("/index.ts")
            ) {
                full_route_path = "/";
            }
            if (full_route_path.endsWith("/index.ts")) {
                full_route_path = full_route_path.substring(
                    0,
                    full_route_path.length - "/index.ts".length,
                );
            }
            if (full_route_path.endsWith(".ts")) {
                full_route_path = full_route_path.substring(
                    0,
                    full_route_path.length - ".ts".length,
                );
            }

            route_handlers[full_route_path] = handler;
        }
    };

    await walk(routes_dir);

    return {
        route_handlers,
        find_route: (query: string) =>
            find_route(
                query,
                Object.keys(route_handlers),
                route_handlers,
            ),
    };
};
