import type { T_Http_Response, T_Http_Route_Request } from "@/lib/http.ts";
import { render } from "@/lib/views.ts";

export default async function handler(
    req: T_Http_Route_Request,
): Promise<T_Http_Response> {
    switch (req.method) {
        case "GET": {
            return req.respond({
                status: 200,
                body: await render("pages/index.vto", { title: "Home" }),
            });
        }

        case "POST": {
            return req.respond({
                status: 201,
                body: await render("pages/index.vto", {
                    title: "Submission accepted",
                    submitted: req.body?.parsed
                        ? JSON.stringify(req.body.parsed, null, 2)
                        : req.body?.text ?? "Nothing",
                }),
            });
        }

        default:
            return req.respond({
                status: 405,
            });
    }
}
