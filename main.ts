import { import_routes, T_Route } from "@/lib/routes.ts";
import { merge_req_params, parse_request, T_Http_Request } from "@/lib/http.ts";
import * as log from "@std/log";
import not_found_handler from "@/routes/404.ts";
import { generate_stack_page } from "@/lib/error.ts";
import * as path from "path";
import * as mime from "@std/media-types";

log.setup({
    handlers: {
        default: new log.ConsoleHandler("DEBUG", {
            formatter: log.formatters.jsonFormatter,
            useColors: false,
        }),
    },
});

const decoder = new TextDecoder();

const safe_close = (conn: Deno.TcpConn) => {
    try {
        conn.close();

        return;
    } catch {
        return;
    }
};

const safe_write = (conn: Deno.TcpConn, data: Uint8Array) => {
    conn.write(data);
    conn.closeWrite();
};

const handle_routing = async (
    conn: Deno.TcpConn,
    req: T_Http_Request,
    route: T_Route,
) => {
    if (route) {
        const data = await Promise.resolve(
            route.handler.default(merge_req_params(req, route.params)),
        );
        return safe_write(conn, data);
    }

    const file_path = path.join(Deno.cwd(), "public", req.pathname);
    let file: Deno.FileInfo | undefined;
    try {
        file = await Deno.stat(file_path);
    } catch {
        file = undefined;
    }
    if (file && file.isFile) {
        const file_data = await Deno.readFile(file_path);
        const split_by_period = req.pathname.split(".");
        const extension = `.${split_by_period[split_by_period.length - 1]}`;

        let content_type = mime.contentType(extension);
        if (!content_type) {
            content_type = "application/octet-stream";
        }

        return safe_write(
            conn,
            req.respond({
                status: 200,
                headers: {
                    content_type,
                },
                body: file_data,
            }),
        );
    }

    return safe_write(conn, not_found_handler(req));
};

const main = async (env: string | undefined) => {
    const { find_route } = await import_routes("./routes");

    const listener = Deno.listen({ port: 8080 });

    log.info("Listening on 0.0.0.0:8080");

    for await (const conn of listener) {
        const reader = conn.readable.getReader();
        const req_first_bytes = await reader.read();
        reader.releaseLock();
        if (!req_first_bytes.value) {
            safe_close(conn);
            continue;
        }

        const req_first_text = decoder.decode(req_first_bytes.value);
        const req = parse_request(req_first_text, req_first_bytes.value);

        try {
            handle_routing(conn, req, find_route(req.pathname));
        } catch (e) {
            console.error(e);

            if (env && env.toLowerCase() === "PRODUCTION") {
                safe_write(conn, req.respond({ status: 500 }));

                continue;
            }

            safe_write(
                conn,
                req.respond({
                    status: 500,
                    body: generate_stack_page(e),
                }),
            );
        }
    }
};

main(Deno.env.get("PRODUCTION_MODE"));
