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
const listener = Deno.listen({
    port: 25,
    transport: "tcp",
})
while (true) {
    const conn = await listener.accept()
    ;(async () => {
        console.log("Connection")
        async function send(text: string) {
            console.log("sent:", await conn.write(toAscii(text)), text)
        }
        await send("220 customsmtp.jmeow.net ready\r\n")
        let data = ""
        let receivingData = false
        try {
            while (true) {
                const buf = new Uint8Array(1024)
                console.log("waiting")
                const bytesCount = await conn.read(buf)
                if (bytesCount == null) {
                    break
                }
                const received = decoder.decode(buf)
                console.log("received:", received)
                if (receivingData) {
                    data += received
                    if (data.split("\r\n.\r\n").length) {
                        receivingData = false
                        data = data.split("\r\n.\r\n")[0]
                        console.log("received data:\n\n\n" + data)
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
        console.log("closed")
    })()
}
