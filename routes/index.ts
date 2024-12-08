import type { T_Http_Response, T_Http_Route_Request } from "@/lib/http.ts";
import { render } from "@/lib/views.ts";

export default async function handler(
    req: T_Http_Route_Request,
): Promise<T_Http_Response> {
    return req.respond({
        status: 200,
        body: await render("pages/index.vto", { title: "Home" }),
    });
}
