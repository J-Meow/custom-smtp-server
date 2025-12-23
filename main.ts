import postgres from "npm:postgres"

const sql = postgres()

const debugLogs = false
function toAscii(text: string) {
    const out = new Uint8Array(text.length)
    for (let i = 0; i < text.length; i++) {
        out[i] = text.charCodeAt(i)
    }
    return out
}
const decoder = new TextDecoder()
// const listener = Deno.listenTls({
//    port: 587,
//    transport: "tcp",
//    cert: Deno.readTextFileSync("./cert.pem"),
//    key: Deno.readTextFileSync("./key.pem"),
// })
async function smtpServer(callback: (email: string) => void) {
    const listener = Deno.listen({
        port: 25,
        transport: "tcp",
    })
    while (true) {
        const conn = await listener.accept()
        ;(async () => {
            if (debugLogs) console.log("Connection")
            async function send(text: string) {
                if (debugLogs) {
                    console.log("sent:", await conn.write(toAscii(text)), text)
                } else {
                    await conn.write(toAscii(text))
                }
            }
            await send("220 customsmtp.jmeow.net ready\r\n")
            let data = ""
            let receivingData = false
            try {
                while (true) {
                    const buf = new Uint8Array(1024)
                    if (debugLogs) console.log("waiting")
                    const bytesCount = await conn.read(buf)
                    if (bytesCount == null) {
                        break
                    }
                    const received = decoder.decode(buf)
                    if (debugLogs) console.log("received:", received)
                    if (receivingData) {
                        data += received
                        if (data.split("\r\n.\r\n").length > 1) {
                            receivingData = false
                            data = data.split("\r\n.\r\n")[0]
                            callback(data)
                            if (debugLogs)
                                console.log("received email:\n\n" + data)
                            data = ""
                            await send("250 OK\r\n")
                        }
                    } else {
                        switch (received.slice(0, 4)) {
                            case "EHLO":
                            case "HELO":
                                await send("250 customsmtp.jmeow.net\r\n")
                                break
                            case "MAIL":
                                await send("250 OK\r\n")
                                break
                            case "RCPT":
                                await send("250 OK\r\n")
                                break
                            case "DATA":
                                await send("354 End <CR><LF>.<CR><LF>\r\n")
                                receivingData = true
                                break
                            case "QUIT":
                                await send("221 Bye\r\n")
                                break
                            default:
                        }
                    }
                }
            } catch (err) {
                console.log("error", err)
            }
            conn.close()
            if (debugLogs) console.log("closed")
        })()
    }
}

smtpServer(async (email) => {
    const headerLines = email.split("\r\n\r\n")[0].split("\r\n")
    const headers: { [key: string]: string } = {}
    let currentHeaderName = ""
    let currentHeaderData = ""
    headerLines.forEach((headerLine) => {
        if (headerLine.trimStart() == headerLine) {
            if (currentHeaderName) {
                headers[currentHeaderName] = currentHeaderData
            }
            currentHeaderName = headerLine.split(":")[0].toLowerCase()
            currentHeaderData = headerLine
                .split(":")
                .slice(1)
                .join(":")
                .trimStart()
        } else {
            currentHeaderData += headerLine.trimStart()
        }
    })
    const body = email.split("\r\n\r\n").slice(1).join("\r\n\r\n")
    const from = headers.from.includes("<")
        ? headers.from.split("<")[1].split(">")[0]
        : headers.from
    const to = headers.to
        .split(",")
        .map((to) =>
            to.includes("<")
                ? to.split("<")[1].split(">")[0].trim()
                : to.trim(),
        )
        .join(",")
    await sql`INSERT INTO public.emails("from", "to", "body", "headers", "subject") VALUES(${from}, ${to}, ${body}, ${JSON.stringify(headers)}, ${headers.subject})`
    console.log("Received email from " + from + " to " + to + ", added to DB")
})

Deno.serve({ port: 8045 }, async (req) => {
    const url = new URL(req.url)

    if (url.pathname.startsWith("/email/")) {
        const type = url.pathname.slice(7).split("/")[0]
        const info = url.pathname.slice(7).split("/")[1]
        let emailResult
        switch (type) {
            case "id":
                emailResult =
                    await sql`SELECT "id", "from", "to", "body", "headers", "subject" FROM public.emails WHERE id=${info}`
                break
            case "subject":
                emailResult =
                    await sql`SELECT "id", "from", "to", "body", "headers", "subject" FROM public.emails WHERE subject=${info}`
                break
            case "to":
                emailResult =
                    await sql`SELECT "id", "from", "to", "body", "headers", "subject" FROM public.emails WHERE "to"=${info}`
                break
            default:
                return new Response(null, { status: 404 })
        }
        if (emailResult.length) {
            const returnVal = emailResult.sort((a, b) => b.id - a.id)[0]
            returnVal.headers = JSON.parse(returnVal.headers)
            return new Response(JSON.stringify(returnVal), {
                headers: { "Content-Type": "application/json" },
            })
        }
    }

    return new Response(null, { status: 404 })
})
