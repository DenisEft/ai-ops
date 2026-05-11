const Imap = require("node-imap");
const imap = new Imap({
  user: "den.eftimitsa@yandex.ru",
  password: "gcmaepvsttghkwlx",
  host: "imap.yandex.ru",
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
});

imap.connect();

imap.on("ready", () => {
  console.log("Connected");
  imap.openBox("INBOX", true, (err) => {
    if (err) {
      console.log("Error opening INBOX:", err.message);
      imap.end();
      return;
    }
    console.log("INBOX opened");
    
    // Fetch only the attachment part
    imap.fetch(1188, { bodies: "BODY[3]", struct: false }, () => {});
  });
});

imap.on("fetch", (streams) => {
  streams.on("message", (msg, seqno) => {
    console.log("Fetching msg", seqno);
    msg.on("body", (stream, info) => {
      var chunks = [];
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("end", () => {
        var data = Buffer.concat(chunks);
        console.log("Got", data.length, "bytes");
        require("fs").writeFileSync("/tmp/attach_final.pdf", data);
        console.log("Saved");
      });
    });
  });
  streams.on("error", (e) => console.log("Fetch error:", e.message));
  streams.on("end", () => {
    console.log("Fetch complete");
    imap.end();
  });
});

imap.on("error", (e) => {
  console.log("IMAP error:", e.message);
  imap.end();
});

// Timeout
setTimeout(() => {
  console.log("Timeout");
  process.exit(0);
}, 30000);
