"use strict";
const fs = require("fs");
const readline = require("readline");
const https = require("https");

const line_divider = "\r\n"; // between line, they should be join with this
const data_divider = "+"; // meta data of each line should be joined with this

let id_pointer = 0;
let chinese_id = "1";
let line_buff = [];
let pool_payload = [];
let pool_cid = [];

const buildPayload = (pl) =>
  "selection=" +
  escape(pl) +
  "&default_opacity=1" +
  "&default_width=3" +
  "&default_radius=7" +
  "&default_color=%23aaaaaa" +
  "&background_color=%23ffffff" +
  "&tax_filter=" +
  "&map=metabolic" +
  "&export_type=svg" +
  "&export_dpi=120";

var rd = readline.createInterface({
  input: fs.createReadStream("miner.tsv"),
  // output: process.stdout,
  console: false,
});

rd.on("line", function (line) {
  const n = line.split("\t");
  const [x, ...y] = n;
  const joinElement = (e) => e.join(data_divider);
  if (x == chinese_id) {
    line_buff.push(joinElement(y));
  } else {
    pool_payload.push(line_buff.join(line_divider));
    line_buff = [joinElement(y)];
    pool_cid.push(chinese_id);
    chinese_id = x;
  }
});

/** 
 * Return Text about the current working / -ed line's chinese_id / index
 */
const whereVR = () => `chinese_id:${pool_cid[id_pointer]},index:${id_pointer}`;

/**
 * Start query the next entry
 */
const queryNext = () => {
  // return; // uncommen to one-shot
  id_pointer++;
  if (id_pointer >= pool_cid.length) {
    console.log("+--------------------+");
    console.log("| ! All query done ! |");
    console.log("+--------------------+");
    console.log("/nReview error.log, may some entry query failed.");
    return;
  }
  getRequest();
};

const writeSVG = (payload) => {
  fs.writeFile(
    `./results/${pool_cid[id_pointer]}.svg`,
    payload,
    "utf8",
    function (err) {
      if (err) {
        console.log(err);
        console.log(`Software breaked at ${whereVR()}`);
        return;
      }
      console.log(`done: ${whereVR()}`);
      queryNext();
    }
  );
};

/**
 * Append chinese_id & its array index into "failed_entry" with format: "<index>,<chinese_id>" on each line
 * @param payload error log to be appended
 */
const logError = (payload) => {
  fs.appendFile(`error.log`, payload, "utf8", function (err) {
    if (err) return console.log("Error when writing error.log. ", err);
    console.log(`Error when querying: ${whereVR()}`);
    queryNext();
  });
};

/**
 * query data from backend.
 */
const getRequest = () => {
  var postData = buildPayload(pool_payload[id_pointer]);
  let data_buffer = "";

  var options = {
    hostname: "pathways.embl.de",
    port: 443,
    path: "/mapping.cgi",
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": postData.length,
    },
  };

  var req = https.request(options, (res) => {

    res.on("data", (d) => {
      // process.stdout.write(d);
      data_buffer += d;
    });

    // When all data transferred
    res.on("close", () => {
      writeSVG(data_buffer);
    });
  });

  // This will cover Timeout error. Attenion: When "error" event (here) tirggered, the "close" event won't
  req.on("error", (e) => {
    console.error(e);
    console.error(`Error: ${whereVR()}`);
    logError(`${whereVR()}\n`);
  });

  req.write(postData);
  req.end();
};

rd.on("close", () => {
  getRequest(id_pointer);
});