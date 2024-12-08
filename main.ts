import { import_routes } from "@/lib/routes.ts";
import { merge_req_params, parse_request } from "@/lib/http.ts";
import * as log from "@std/log";
import not_found_handler from "@/routes/404.ts";

log.setup({
	handlers: {
		default: new log.ConsoleHandler("DEBUG", {
			formatter: log.formatters.jsonFormatter,
			useColors: false,
		}),
	},
});

const decoder = new TextDecoder();

const safe_close = (conn: Deno.TcpConn) => {
	try {
		conn.close();

		return;
	} catch {
		return;
	}
};

const main = async () => {
	const { find_route } = await import_routes("./routes");

	const listener = Deno.listen({ port: 8080 });

	log.info(`Listening on 0.0.0.0:8080`);

	for await (const conn of listener) {
		const reader = conn.readable.getReader();
		const req_first_bytes = await reader.read();
		reader.releaseLock();
		if (!req_first_bytes.value) {
			safe_close(conn);
			continue;
		}

		const req_first_text = decoder.decode(req_first_bytes.value);
		const req = parse_request(req_first_text);

		const route = find_route(req.pathname);
		if (route) {
			const data = await Promise.resolve(
				route.handler.default(merge_req_params(req, route.params)),
			);
			conn.write(data);
		} else {
			conn.write(not_found_handler(req));
		}

		conn.closeWrite();
	}
};

main();
