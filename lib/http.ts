import { v1 as uuidv1 } from "@std/uuid";
import { STATUS_TEXT } from "@std/http/status";
import type { StatusCode } from "@std/http/status";
import type { T_Route_Request } from "@/types/routes.ts";

const HTTP_1_1_HEADER_DELIM = ": ";
const HTTP_1_1_COOKIE_DELIM = ";";
const HTTP_1_1_COOKIE_VALUE_DELIM = "=";
const CARRIAGE_RETURN_STR = "\r";

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

const encoder = new TextEncoder();

export type T_Http_Request = {
    id: string;
    method: string;
    pathname: string;
    version: string;
    cookies: { [key: string]: string };
    headers: { [key: string]: string };
    respond: (
        opts: {
            status: StatusCode;
            headers?: { [key: string]: string };
            body: string;
        },
    ) => Uint8Array;
};

export type T_Http_Response = Uint8Array;

export const parse_request = (
    req_text: string,
): T_Http_Request => {
    const lines = req_text.split("\n");

    const start_line = lines[0].replace("\r", "").split(" ");
    const method = start_line[0];
    const pathname = start_line[1];
    const version = start_line[2];

    const cookies: { [key: string]: string } = {};
    const headers: { [key: string]: string } = {};

    for (let i = 1; i < lines.length; i++) {
        const curr_line = lines[i];
        if (curr_line.trim() === "" || curr_line === CARRIAGE_RETURN_STR) {
            continue;
        }

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

            default: {
                headers[curr_header_name] = curr_line.substring(
                    curr_header_name.length + HTTP_1_1_HEADER_DELIM.length,
                    header_line_end_index,
                );

                break;
            }
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
        respond: (
            opts: {
                status: StatusCode;
                headers?: { [key: string]: string };
                body: string;
            },
        ) => {
            opts.headers = {
                server: "pornhub",
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

            if (opts.body) {
                res += `\n${opts.body}`;
            }

            return encoder.encode(res);
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
