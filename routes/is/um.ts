import type { T_Http_Response, T_Http_Route_Request } from "@/lib/http.ts";
import { render } from "@/lib/views.ts";

export default async function handler(
    req: T_Http_Route_Request,
): Promise<T_Http_Response> {
    switch (req.method) {
        case "GET": {
            return req.respond({
                status: 200,
                headers: {
                    content_type: "text/html",
                },
                body: await render("pages/um.vto", { title: "Um" }),
            });
        }

        default:
            return req.respond({
                status: 405,
            });
    }
}
