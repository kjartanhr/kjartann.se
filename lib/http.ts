import { v1 as uuidv1 } from "@std/uuid";
import { STATUS_TEXT } from "@std/http/status";
import type { StatusCode } from "@std/http/status";
import type { T_Route_Request } from "@/types/routes.ts";

const HTTP_1_1_HEADER_DELIM = ": ";
const HTTP_1_1_COOKIE_DELIM = ";";
const HTTP_1_1_COOKIE_VALUE_DELIM = "=";
const CARRIAGE_RETURN_STR = "\r";
const ILLEGAL_RE = /[\?<>\\:\*\|"]/g;
// deno-lint-ignore no-control-regex
const CONTROL_RE = /[\x00-\x1f\x80-\x9f]/g;
const RESERVED_RE = /^\.+$/;
const WIN_RESERVED_RE = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
const WIN_TRAILING_RE = /[\. ]+$/;

const format_header = (header: string) => {
    const capitalize = (word: string) => {
        return word.charAt(0).toUpperCase() + word.substring(1);
    };

    const words = header.split("_");
    if (words.length === 1) {
        return capitalize(words[0]);
    }

    let return_str = "";
    for (let i = 0; i < words.length; i++) {
        if (i === words.length - 1) {
            return_str += capitalize(words[i]);
            continue;
        }

        return_str += capitalize(words[i]) + "-";
    }

    return return_str;
};

const sanitise_pathname = (pathname: string) => {
    return pathname
        .replace(ILLEGAL_RE, "")
        .replace(CONTROL_RE, "")
        .replace(RESERVED_RE, "")
        .replace(WIN_RESERVED_RE, "")
        .replace(WIN_TRAILING_RE, "");
};

const encoder = new TextEncoder();

export type T_Http_Request = {
    id: string;
    method: string;
    pathname: string;
    version: string;
    cookies: { [key: string]: string };
    headers: { [key: string]: string | number };
    body: { bytes: Uint8Array; text?: string; parsed?: object } | null;
    respond: (
        opts: {
            status: StatusCode;
            headers?: { [key: string]: string };
            body?: string | Uint8Array;
        },
    ) => Uint8Array;
};

export type T_Http_Response = Uint8Array;

export const parse_request = (
    req_text: string,
    req_bytes: Uint8Array,
): T_Http_Request => {
    const lines = req_text.split("\n");

    const start_line = lines[0].replace("\r", "").split(" ");
    const method = start_line[0];
    const pathname = sanitise_pathname(start_line[1]);
    const version = start_line[2];

    const cookies: { [key: string]: string } = {};
    const headers: { [key: string]: string | number } = {};

    for (let i = 1; i < lines.length; i++) {
        const curr_line = lines[i];

        const curr_header = curr_line.split(HTTP_1_1_HEADER_DELIM);
        if (curr_header.length < 2) {
            continue;
        }

        const curr_header_name = curr_header[0].toLowerCase().replaceAll(
            "-",
            "_",
        );

        let header_line_end_index = curr_line.length;
        if (curr_line.endsWith(CARRIAGE_RETURN_STR)) {
            header_line_end_index = curr_line.length -
                CARRIAGE_RETURN_STR.length;
        }

        switch (curr_header_name) {
            case "cookie": {
                const cookie_string = curr_line.substring(
                    curr_header_name.length + HTTP_1_1_HEADER_DELIM.length,
                    header_line_end_index,
                );

                const cookie_entries = cookie_string.split(
                    HTTP_1_1_COOKIE_DELIM,
                );
                for (let i = 0; i < cookie_entries.length; i++) {
                    const [key, value] = cookie_entries[i].split(
                        HTTP_1_1_COOKIE_VALUE_DELIM,
                    );

                    if (!key || !value) {
                        continue;
                    }

                    cookies[key.trim()] = value.trim();
                }

                break;
            }

            case "content_length": {
                headers["content_length"] = Number(
                    curr_line.substring(
                        curr_header_name.length + HTTP_1_1_HEADER_DELIM.length,
                        header_line_end_index,
                    ),
                );
                break;
            }

            default: {
                headers[curr_header_name] = curr_line.substring(
                    curr_header_name.length + HTTP_1_1_HEADER_DELIM.length,
                    header_line_end_index,
                );

                break;
            }
        }
    }

    let body: T_Http_Request["body"] = null;
    if (typeof headers.content_length === "number") {
        const body_bytes = req_bytes.slice(
            req_bytes.length - headers.content_length,
        );

        body = { bytes: body_bytes };
        try {
            body.text = new TextDecoder().decode(body_bytes);
        } catch {
            // nothing
        }
    }

    if (body?.text && headers.content_type) {
        switch (headers.content_type) {
            case "application/json": {
                try {
                    body.parsed = JSON.parse(body.text);
                } catch {
                    // nothing
                }

                break;
            }

            case "application/x-www-form-urlencoded":
                try {
                    body.parsed = Object.fromEntries(
                        new URLSearchParams(body.text),
                    );
                } catch {
                    // nothing
                }

                break;
        }
    }

    const rid = uuidv1.generate();

    return {
        id: rid,
        method,
        pathname,
        version,
        cookies,
        headers,
        body,
        respond: (
            opts: {
                status: StatusCode;
                headers?: { [key: string]: string };
                body?: string | Uint8Array;
            },
        ) => {
            opts.headers = {
                server: "catboy",
                x_request_id: rid,
                ...opts.headers,
            };

            let res = `HTTP/1.1 ${opts.status} ${STATUS_TEXT[opts.status]}\n`;

            const header_entries = Object.entries(opts.headers);
            for (let i = 0; i < header_entries.length; i++) {
                const [header, value] = header_entries[i];
                res += format_header(header);
                res += HTTP_1_1_HEADER_DELIM;
                res += `${value}\n`;
            }

            let res_bytes = encoder.encode(res);

            if (opts.body) {
                let body_bytes: Uint8Array | undefined;
                if (typeof opts.body === "string") {
                    body_bytes = encoder.encode(`\n${opts.body}`);
                } else {
                    body_bytes = new Uint8Array([
                        ...encoder.encode("\n"),
                        ...opts.body,
                    ]);
                }

                res_bytes = new Uint8Array([...res_bytes, ...body_bytes]);
            }

            return res_bytes;
        },
    };
};

export type T_Http_Route_Request =
    & T_Http_Request
    & Pick<T_Route_Request, "params">;

export const merge_req_params = (
    req: T_Http_Request,
    params: T_Route_Request["params"],
): T_Http_Route_Request => {
    return { ...req, params };
};
