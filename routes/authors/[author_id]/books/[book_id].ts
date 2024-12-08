import type { T_Http_Response, T_Http_Route_Request } from "@/lib/http.ts";

export default function handler(
    _req: T_Http_Route_Request,
): T_Http_Response {
    return _req.respond({
        status: 200,
        body: `<h1>book ${_req.params.book_id}</h1>`,
    });
}
