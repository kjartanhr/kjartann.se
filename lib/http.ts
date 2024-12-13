import { v1 as uuidv1 } from "@std/uuid";
import { STATUS_TEXT } from "@std/http/status";
import type { StatusCode } from "@std/http/status";
import type { T_Route_Request } from "@/types/routes.ts";
import { safe_close, safe_write } from "@/lib/tcp.ts";
import {
    CHAR_COLON,
    CHAR_CR,
    CHAR_H,
    CHAR_HYPHEN,
    CHAR_LF,
    CHAR_P,
    CHAR_PERIOD,
    CHAR_SLASH,
    CHAR_SPACE,
    CHAR_T,
    LOOKUP_LOWER,
    LOOKUP_NORMAL,
    LOOKUP_UPPER,
} from "@/lib/ascii.ts";

const decoder = new TextDecoder();
const encoder = new TextEncoder();

const HTTP_1_1_HEADER_DELIM = ": ";
const HTTP_1_1_COOKIE_DELIM = ";";
const HTTP_1_1_COOKIE_VALUE_DELIM = "=";
const ILLEGAL_RE = /[\?<>\\:\*\|"]/g;
// deno-lint-ignore no-control-regex
const CONTROL_RE = /[\x00-\x1f\x80-\x9f]/g;
const RESERVED_RE = /^\.+$/;
const WIN_RESERVED_RE = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
const WIN_TRAILING_RE = /[\. ]+$/;

export const format_header = (header: string) => {
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

export type T_Http_Request = {
    id: string;
    method: string;
    pathname: string;
    version: {
        major: string;
        minor: string;
    };
    cookies: { [key: string]: string };
    headers: { [key: string]: string | number };
    body:
        | { bytes: Uint8Array; text: string | null; parsed: object | null }
        | null;
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
    chunk: Uint8Array,
    conn: Deno.TcpConn,
): T_Http_Request => {
    let state = "STATE_METHOD";
    let version_minor = "";
    let version_major = "";
    let method = "";
    let pathname = "";
    let curr_header_key = "";
    let curr_header_value = "";
    let body_offset = 0;

    const headers: { [key: string]: string } = {};
    const body_bytes_stored_with_bad_practice: number[] = [];

    http_fsm: for (let i = 0; i < chunk.byteLength; i++) {
        const char = chunk[i];

        switch (state) {
            case "STATE_METHOD": {
                if (char === CHAR_SPACE) {
                    state = "STATE_PATH";

                    continue;
                }

                method += LOOKUP_UPPER[char];

                continue;
            }

            case "STATE_PATH": {
                if (char === CHAR_SPACE) {
                    state = "STATE_VERSION_MAJOR";

                    continue;
                }

                pathname += LOOKUP_NORMAL[char];

                continue;
            }

            case "STATE_VERSION_MAJOR": {
                if (char === CHAR_PERIOD) {
                    state = "STATE_VERSION_MINOR";

                    continue;
                }

                if (
                    char !== CHAR_H && char !== CHAR_T &&
                    char !== CHAR_P && char !== CHAR_SLASH
                ) {
                    version_major = LOOKUP_NORMAL[char];
                }

                continue;
            }

            case "STATE_VERSION_MINOR": {
                if (
                    char === CHAR_CR &&
                    chunk[i + 1] === CHAR_LF
                ) {
                    state = "STATE_HEADER_KEY";

                    continue;
                }

                version_minor = LOOKUP_NORMAL[char];

                continue;
            }

            case "STATE_HEADER_KEY": {
                if (char === CHAR_COLON) {
                    state = "STATE_HEADER_VALUE";

                    continue;
                }

                if (
                    curr_header_key.trim() !== "" &&
                    curr_header_value.trim() !== "" &&
                    !headers[curr_header_key]
                ) {
                    headers[curr_header_key] = curr_header_value;
                    curr_header_key = "";
                    curr_header_value = "";
                }

                if (char === CHAR_HYPHEN) {
                    curr_header_key += "_";

                    continue;
                }

                curr_header_key += LOOKUP_LOWER[char];

                continue;
            }

            case "STATE_HEADER_VALUE": {
                if (
                    char === CHAR_CR &&
                    chunk[i + 1] === CHAR_LF &&
                    chunk[i + 2] === CHAR_CR &&
                    chunk[i + 3] === CHAR_LF
                ) {
                    state = "STATE_BODY";

                    continue;
                }

                if (
                    char === CHAR_CR &&
                    chunk[i + 1] === CHAR_LF
                ) {
                    state = "STATE_HEADER_KEY";

                    continue;
                }

                if (
                    char === CHAR_SPACE &&
                    chunk[i - 1] === CHAR_COLON
                ) {
                    continue;
                }

                curr_header_value += LOOKUP_NORMAL[char];

                continue;
            }

            case "STATE_BODY": {
                if (
                    curr_header_key.trim() !== "" &&
                    curr_header_value.trim() !== "" &&
                    !headers[curr_header_key]
                ) {
                    headers[curr_header_key] = curr_header_value;
                    curr_header_key = "";
                    curr_header_value = "";
                }

                const IS_BODY_BEGINNING = char === CHAR_LF &&
                    chunk[i + 1] === CHAR_CR &&
                    chunk[i + 2] === CHAR_LF;
                const IS_NO_CONTENT_LENGTH = !headers.content_length;

                if (
                    IS_BODY_BEGINNING && IS_NO_CONTENT_LENGTH &&
                    chunk[i + 3]
                ) {
                    safe_write(
                        conn,
                        encoder.encode(
                            "HTTP/1.1 411 Length Required\r\nServer: catboy",
                        ),
                    );
                    safe_close(conn);

                    break http_fsm;
                }

                if (IS_BODY_BEGINNING) {
                    body_offset = i + 3;
                }

                if (headers.content_length && i >= body_offset) {
                    body_bytes_stored_with_bad_practice.push(char);
                }

                continue;
            }
        }
    }

    const body_bytes = new Uint8Array(
        body_bytes_stored_with_bad_practice,
    );
    const body_text = decoder.decode(body_bytes);
    let body_parsed = null;

    if (body_text.length > 0 && headers.content_type) {
        switch (headers.content_type) {
            case "application/json": {
                try {
                    body_parsed = JSON.parse(body_text);
                } catch {
                    // nothing
                }

                break;
            }

            case "application/x-www-form-urlencoded":
                try {
                    body_parsed = Object.fromEntries(
                        new URLSearchParams(body_text),
                    );
                } catch {
                    // nothing
                }

                break;
        }
    }

    let body = null;
    if (body_bytes.length > 0) {
        if (body_text) {
            body = { bytes: body_bytes, text: body_text, parsed: body_parsed };
        } else {
            body = { bytes: body_bytes, text: null, parsed: body_parsed };
        }
    }

    const cookies: { [key: string]: string } = {};
    if (headers.cookie) {
        const cookie_entries = headers.cookie.split(HTTP_1_1_COOKIE_DELIM);
        for (let i = 0; i < cookie_entries.length; i++) {
            const [key, value] = cookie_entries[i].split(
                HTTP_1_1_COOKIE_VALUE_DELIM,
            );

            if (!key || !value) {
                continue;
            }

            cookies[key.trim()] = value.trim();
        }
        delete headers.cookie;
    }

    const rid = uuidv1.generate();
    return {
        id: rid,
        method,
        pathname: sanitise_pathname(pathname),
        version: {
            major: version_major,
            minor: version_minor,
        },
        headers,
        cookies,
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

            let res = `HTTP/1.1 ${opts.status} ${STATUS_TEXT[opts.status]}\r\n`;

            const header_entries = Object.entries(opts.headers);
            for (let i = 0; i < header_entries.length; i++) {
                const [header, value] = header_entries[i];
                res += format_header(header);
                res += HTTP_1_1_HEADER_DELIM;
                res += `${value}\r\n`;
            }

            let res_bytes = encoder.encode(res);

            if (opts.body) {
                let body_bytes: Uint8Array | undefined;
                if (typeof opts.body === "string") {
                    body_bytes = encoder.encode(`\r\n${opts.body}`);
                } else {
                    body_bytes = new Uint8Array([
                        ...encoder.encode("\r\n"),
                        ...opts.body,
                    ]);
                }

                res_bytes = new Uint8Array([
                    ...res_bytes,
                    ...body_bytes,
                ]);
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
