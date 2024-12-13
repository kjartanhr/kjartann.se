import * as log from "@std/log";
import * as path from "path";
import * as mime from "@std/media-types";
import { import_routes, T_Route } from "@/lib/routes.ts";
import { merge_req_params, parse_request, T_Http_Request } from "@/lib/http.ts";
import not_found_handler from "@/routes/404.ts";
import { generate_stack_page, Intentional_Any } from "@/lib/error.ts";
import { safe_write } from "@/lib/tcp.ts";

log.setup({
    handlers: {
        default: new log.ConsoleHandler("DEBUG", {
            formatter: log.formatters.jsonFormatter,
            useColors: false,
        }),
    },
});

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

        return await safe_write(
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

    return await safe_write(conn, not_found_handler(req));
};

const handle_conn_err = (e: Intentional_Any) => {
    if (e instanceof Deno.errors.ConnectionReset) {
        return;
    }

    if (e instanceof Deno.errors.ConnectionAborted) {
        return;
    }

    console.error("Connection Error", e);
};

const main = async (env: string | undefined) => {
    const { find_route } = await import_routes("./routes");

    const listener = Deno.listen({ port: 8080 });

    log.info("Listening on 0.0.0.0:8080");

    for await (const conn of listener) {
        try {
            for await (const chunk of conn.readable) {
                const req = parse_request(chunk, conn);

                try {
                    handle_routing(conn, req, find_route(req.pathname));
                } catch (e) {
                    console.error("lalala", e);

                    if (env && env.toLowerCase() === "PRODUCTION") {
                        await safe_write(
                            conn,
                            req.respond({ status: 500 }),
                        );

                        continue;
                    }

                    await safe_write(
                        conn,
                        req.respond({
                            status: 500,
                            body: generate_stack_page(e),
                        }),
                    );
                }
            }
        } catch (e) {
            handle_conn_err(e);
        }
    }
};

main(Deno.env.get("PRODUCTION_MODE"));
