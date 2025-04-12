# kjartann.se

This repository contains the source code for my website, kjartann.se /
kjartann.is / kjartan.io, and assets referenced within it.

The project is a full-stack web application written in TypeScript using Deno as
the runtime of choice.

The web server is a HTTP implementation built from scratch atop the
`Deno.listen()` function. Additional processing on top of the base HTTP
implementation, such as routing and dynamic static file serving, is also built
from scratch with primitives provided by Deno.

## Current status of this project's goals

- [x] Build a working HTTP server from scratch using only Deno provided
      primitives - to learn how TCP sockets work in Deno and to practice writing
      FSMs.
- [x] Build a primitive filesystem-based routing system inspired by Next.js with
      only Deno provided primitives.
- [x] Build a React/Next.js-like experience with no framework; only hand-written
      server-side and client-side JavaScript.
- [ ] Add a blog section to my website.
- [ ] Use Drizzle ORM - bonus points if it's in a Deno project.
- [x] Use HTMX inspired concepts such as responding with partial HTML content
      from the server to build an interactive web-app experience.
- [ ] Test re-used code, such as HTTP FSM implementation etc., with Deno test
      suite.

## Technologies used in this project

- TypeScript (and Deno)
- Deno standard library (@std)
- Vento templating engine
- Tailwind CSS
- html-minifier

## What have I learned?

In summary:

- HTTP is _slightly_ more complicated than `receive request`,
  `wait for entire request text`, `parse request text`, and `send response`. No,
  you must think of a HTTP request in the context of a TCP stream (unsure if
  this is correct terminology). **I did this with a finite-state-machine,
  parsing each byte of the request text as it streamed in.**
- Everyone implements HTTP _slightly_ differently, and sometimes **you** have to
  account for the inconsistencies. In my case, I had to make sure to send _some_
  HTML with every redirect (301, 302, 307, 308) response so Cloudflare's reverse
  proxy wouldn't assume the server to be dead and throw a bad gateway error.
- When trying to get the type (mimetype) of a file, everyone basically guesses.
  File extensions are hints, not truths.
- For how complicated TCP is/seems, it is surprisingly simple.

## How to run

To run the development server:

```
deno run dev
```

To run in "production":

```
PRODUCTION_MODE=PRODUCTION deno run --allow-net --allow-sys=networkInterfaces,hostname --allow-read --allow-env --env-file=.env main.ts
```
