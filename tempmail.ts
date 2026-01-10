const emailEnd = "@customsmtp.jmeow.net"
const activeEmails: { [key: string]: { email: string } } = {}

Deno.serve({ port: 6853 }, async (req, connInfo) => {
    const hostname =
        req.headers.get("x-real-ip") || connInfo.remoteAddr.hostname
    if (!req.url.endsWith("/emails"))
        console.log(
            `${new Date().toLocaleString()} - ${hostname} - ${req.method} ${req.url}`,
        )
    const url = new URL(req.url)
    if (url.pathname == "/" && req.method == "GET") {
        return new Response(Deno.readTextFileSync("tempmail.html"), {
            status: 200,
            headers: {
                "Content-Type": "text/html",
            },
        })
    }
    function newEmail(host: string) {
        let email = ""
        email += "tempemail"
        email += Math.floor(Math.random() * 10000000)
            .toString()
            .padStart(7, "0")
        email += emailEnd
        activeEmails[host] = {
            email,
        }
    }
    if (url.pathname == "/getEmail" && req.method == "GET") {
        if (!(hostname in activeEmails)) {
            newEmail(hostname)
        }
        return new Response(activeEmails[hostname].email, {
            status: 200,
        })
    }
    if (url.pathname == "/emails" && req.method == "GET") {
        if (!(hostname in activeEmails)) {
            newEmail(hostname)
        }
        const email = activeEmails[hostname].email
        const response = await (
            await fetch(
                "http://" +
                    Deno.env.get("SERVERURL") +
                    ":8045/emails/to/" +
                    email,
                {
                    headers: {
                        authorization: "Bearer " + Deno.env.get("APIKEY"),
                    },
                },
            )
        ).text()
        return new Response(response.length ? response : "[]", {
            headers: { "Content-Type": "application/json" },
            status: 200,
        })
    }
    if (url.pathname == "/newEmail" && req.method == "POST") {
        newEmail(hostname)
        return new Response(null, {
            status: 204,
        })
    }
    return new Response(null, { status: 404 })
})
