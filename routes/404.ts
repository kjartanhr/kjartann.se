import type { T_Http_Request, T_Http_Response } from "@/lib/http.ts";

export default function handler(
    req: T_Http_Request,
): T_Http_Response {
    return req.respond({
        status: 404,
        body: `<h1>404 not found</h1>`,
    });
}
