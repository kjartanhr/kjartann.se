import type { T_Http_Response, T_Http_Route_Request } from "@/lib/http.ts";

type T_Parsed_Language_Entry = {
    language: string;
    region?: string;
    quality?: number;
};

const parse_accept_language_header = (value: string) => {
    const result: T_Parsed_Language_Entry[] = [];

    const entries = value.split(",");
    for (let i = 0; i < entries.length; i++) {
        let code: string | undefined;
        let region: string | undefined;
        let quality: number | undefined;

        const [entry_code, entry_quality] = entries[i].split(";");
        if (entry_quality) {
            const [_q, quality_value] = entry_quality.split("=");

            quality = Number(quality_value);
        }

        if (entry_code) {
            const [entry_lang, entry_region] = entry_code.split("-");
            code = entry_lang;
            region = entry_region;
        }

        if (!code) {
            continue;
        }

        result.push({
            language: code.toLowerCase(),
            region: region?.toLowerCase(),
            quality,
        });
    }

    return result;
};

export default function handler(
    req: T_Http_Route_Request,
): T_Http_Response {
    if (req.method !== "GET") {
        return req.respond({ status: 405 });
    }

    const default_response = req.respond({
        status: 301,
        headers: { location: "/en" },
    });

    if (req.headers.accept_language) {
        const acceptable_languages = parse_accept_language_header(
            req.headers.accept_language,
        );

        const first_language = acceptable_languages[0];
        if (!first_language) {
            return default_response;
        }

        if (first_language.language === "is") {
            return req.respond({ status: 301, headers: { location: "/is" } });
        }
    }

    return default_response;
}
