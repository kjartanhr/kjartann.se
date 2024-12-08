import type { T_Http_Response, T_Http_Route_Request } from "@/lib/http.ts";

export default function handler(
    req: T_Http_Route_Request,
): T_Http_Response {
    return req.respond({
        status: 200,
        body: `<h1>creating id ${req.params.id}</h1>`,
    });
}
