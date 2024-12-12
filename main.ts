import { import_routes, T_Route } from "@/lib/routes.ts";
import { merge_req_params, parse_request, T_Http_Request } from "@/lib/http.ts";
import * as log from "@std/log";
import not_found_handler from "@/routes/404.ts";
import { generate_stack_page } from "@/lib/error.ts";
import * as path from "path";
import * as mime from "@std/media-types";

const CHAR_UPPER = [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
];

const CHAR_LOWER = [
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
    "g",
    "h",
    "i",
    "j",
    "k",
    "l",
    "m",
    "n",
    "o",
    "p",
    "q",
    "r",
    "s",
    "t",
    "u",
    "v",
    "w",
    "x",
    "y",
    "z",
];

const LOOKUP_FILL0 = [
    "\0",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    " ",
    "!",
    '"',
    "#",
    "$",
    "%",
    "&",
    "'",
    "",
    "",
    "*",
    "+",
    ",",
    "-",
    ".",
    "/",
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    ":",
    ";",
    "<",
    "=",
    ">",
    "?",
    "@",
];

const LOOKUP_FILL1 = ["[", "\\", "]", "^", "_", "`"];
const LOOKUP_FILL2 = ["{", "|", "}", "~", ""];

const ASCII_LOOKUP_NORMAL = [
    ...LOOKUP_FILL0,
    ...CHAR_UPPER,
    ...LOOKUP_FILL1,
    ...CHAR_LOWER,
    ...LOOKUP_FILL2,
];
const ASCII_LOOKUP_LOWER = [
    ...LOOKUP_FILL0,
    ...CHAR_LOWER,
    ...LOOKUP_FILL1,
    ...CHAR_LOWER,
    ...LOOKUP_FILL2,
];
const ASCII_LOOKUP_UPPER = [
    ...LOOKUP_FILL0,
    ...CHAR_UPPER,
    ...LOOKUP_FILL1,
    ...CHAR_UPPER,
    ...LOOKUP_FILL2,
];

const ASCII_CHAR_SPACE = 32;

const ASCII_CHAR_PERIOD = 46;

const ASCII_CHAR_H = 72;

const ASCII_CHAR_T = 84;

const ASCII_CHAR_P = 80;

const ASCII_CHAR_SLASH = 47;

const ASCII_CHAR_CR = 13;

const ASCII_CHAR_LF = 10;

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
        /*const reader = conn.readable.getReader();
        const req_first_bytes = await reader.read();
        reader.releaseLock();
        if (!req_first_bytes.value) {
            safe_close(conn);
            continue;
        }

        const req_first_text = decoder.decode(req_first_bytes.value);
        const req = parse_request(req_first_text, req_first_bytes.value);*/

        let state = "STATE_METHOD";
        let version_minor = undefined;
        let version_major = undefined;
        let method = "";
        let pathname = "";
        for await (const chunk of conn.readable) {
            for (let i = 0; i < 25; i++) {
                const char = chunk[i];

                switch (state) {
                    case "STATE_METHOD": {
                        if (char === ASCII_CHAR_SPACE) {
                            state = "STATE_PATH";

                            continue;
                        }

                        method += ASCII_LOOKUP_UPPER[char];

                        continue;
                    }

                    case "STATE_PATH": {
                        if (char === ASCII_CHAR_SPACE) {
                            state = "STATE_VERSION_MAJOR";

                            continue;
                        }

                        pathname += ASCII_LOOKUP_NORMAL[char];

                        continue;
                    }

                    case "STATE_VERSION_MAJOR": {
                        if (char === ASCII_CHAR_PERIOD) {
                            state = "STATE_VERSION_MINOR";

                            continue;
                        }

                        if (
                            char !== ASCII_CHAR_H && char !== ASCII_CHAR_T &&
                            char !== ASCII_CHAR_P && char !== ASCII_CHAR_SLASH
                        ) {
                            version_major = ASCII_LOOKUP_NORMAL[char];
                        }

                        continue;
                    }

                    case "STATE_VERSION_MINOR": {
                        if (
                            char === ASCII_CHAR_CR &&
                            chunk[i + 1] === ASCII_CHAR_LF
                        ) {
                            state = "STATE_HEADER_KEY";

                            continue;
                        }

                        version_minor = ASCII_LOOKUP_NORMAL[char];

                        continue;
                    }
                }
            }

            console.log(method, pathname, version_major, version_minor);
        }

        /*try {
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
        }*/
    }
};

main(Deno.env.get("PRODUCTION_MODE"));
