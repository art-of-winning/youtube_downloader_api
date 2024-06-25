const ytdl = require("ytdl-core");
const cors = require("cors");
const express = require("express");

const app = express();
app.use(cors("*"));
const port = 3000;

app.get("/download", async (req, res) => {
  try {
    const { URL, downloadFormat, quality, title } = req.query;
    let totalSize = 0;
    const filename = `${title.substring(
      0,
      downloadFormat === "audio-only" ? 40 : 25
    )}.${downloadFormat === "audio-only" ? "mp3" : "mp4"}`;
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    const info = await ytdl.getInfo(URL);
    info.formats.forEach((format) => {
      if (
        format.container === (downloadFormat === "audio-only" ? "m4a" : "mp4")
      ) {
        totalSize = format.contentLength;
      }
    });
    let downloaded = 0;

    const stream = ytdl(URL, {
      filter:
        downloadFormat === "audio-only"
          ? (format) => format.container === "m4a" && !format.encoding
          : downloadFormat === "video-only"
          ? "videoonly"
          : "audioandvideo",
      quality:
        quality === "high"
          ? downloadFormat === "audio-only"
            ? "highest"
            : "highestvideo"
          : downloadFormat === "audio-only"
          ? "lowest"
          : "lowestvideo",
    });

    stream.on("progress", (_, downloadedBytes, totalBytes) => {
      downloaded = downloadedBytes;
      res.write(`data: ${((downloaded / totalSize) * 100).toFixed(2)}\n\n`);
    });

    stream.on("end", () => {
      res.end();
    });

    stream.pipe(res);
  } catch (e) {
    console.log(e);
    res.status(500).send("An error occurred while processing your request.");
  }
});

// SSE endpoint for progress updates
app.get("/progress", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Function to send progress update
  const sendProgressUpdate = (percentage) => {
    res.write(`data: ${percentage}\n\n`);
  };

  // Store the sendProgressUpdate function to use it in the download endpoint
  req.app.locals.sendProgressUpdate = sendProgressUpdate;

  req.on("close", () => {
    req.app.locals.sendProgressUpdate = null;
    res.end();
  });
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});


//OG
app.get("/downloads", async (req, res) => {
  try {
    const { URL, downloadFormat, quality, title } = req.query;
    if (downloadFormat === "audio-only") {
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${title.substring(0, 40)}.mp3`
      );
      ytdl(URL, {
        filter: (format) => format.container === "m4a" && !format.encoding,
        quality: quality === "high" ? "highest" : "lowest",
      }).pipe(res);
    } else {
      res.header(
        "Content-Disposition",
        `attachment; filename="${title.substring(0, 25)}.mp4"`
      );
      ytdl(URL, {
        filter: downloadFormat === "video-only" ? "videoonly" : "audioandvideo",
        quality: quality === "high" ? "highestvideo" : "lowestvideo",
      }).pipe(res);
    }
  } catch (e) {
    console.log(e);
  }
});


