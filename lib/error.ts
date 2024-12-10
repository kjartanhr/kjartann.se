import * as html from "@std/html";

// deno-lint-ignore no-explicit-any
export type Intentional_Any = any;

export const generate_stack_page = (e: Intentional_Any) => {
    let message;
    let cause;
    let stack;
    if (e instanceof Error) {
        message = html.escape(e.message);
        cause = html.escape(`${e.cause}`);
        stack = html.escape(`${e.stack}`);
    }

    return `<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Internal server error</title>
    </head>
    <body>
        <h1>Internal server error</h1>
		<hr />
		<p>Error message</p>
		<pre style="white-space: pre-wrap;">
${message}
		</pre>

		<hr />
		<p>Error cause</p>
		<pre style="white-space: pre-wrap;">
${cause}
		</pre>

		<hr />
		<p>Error stack</p>
		<pre style="white-space: pre-wrap;">
${stack}
		</pre>

		<hr />
		<p>&copy; 2024 Octan Limited. Thrown ${new Date().toISOString()}</p>
    </body>
</html>`;
};
