"use strict";
var fs = require("fs"),
  readline = require("readline");
const https = require("https");

const line_divider = "\r\n"; // between line, they should be join with this
const data_divider = "+"; // meta data of each line should be joined with this

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

let id_pointer = 4024;
let chinese_id = "1";
let line_buff = [];
let pool_payload = [];
let pool_cid = [];

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
 * Start query the next entry
 */
const queryNext = () => {
  return; // uncommen when one-shot wanted
  id_pointer++;
  if (id_pointer >= pool_cid.length) {
    console.log("All query done");
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
        console.log(
          `Software breaked at chinese_id: ${pool_cid[id_pointer]}, index: ${id_pointer}`
        );
        return;
      }
      console.log(
        `done: chinese_id: ${pool_cid[id_pointer]}, index: ${id_pointer}`
      );
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
    console.log(
      `Error when querying: chinese_id: ${pool_cid[id_pointer]}, index: ${id_pointer}`
    );
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
    // console.log("statusCode:", res.statusCode);
    // console.log("headers:", res.headers);

    res.on("data", (d) => {
      // process.stdout.write(d);
      data_buffer += d;
    });

    // When all data transferred
    res.on("close", () => {
      // console.log(data_buffer);
      // console.log("close event of https.request");
      // TODO: check if its the last index, if not, call getRequest again.
      writeSVG(data_buffer);
    });
  });

  // This will cover Timeout error, attenion: When "error" event (here) tirggered, the "close" event won't
  req.on("error", (e) => {
    console.error(e);
    console.error(
      `Error: chinese_id: ${pool_cid[id_pointer]}, index: ${id_pointer}`
    );
    logError(`${id_pointer},${pool_cid[id_pointer]}\n`);
  });

  req.write(postData);
  req.end(/*() => console.log('finished') */);
};

rd.on("close", () => {
  //   console.log("file read done");
  //   console.log(pool_payload[0]);
  //   console.log("//////////////////////////////////////");
  //   console.log(pool_payload[1]);
  // console.log('//////////////////////////////////////');
  // console.log(pool[2]);
  getRequest(id_pointer);
});

///////////////////////////////////// NOTE /////////////////////////////////////

// one example payload:
const example =
  "selection=C11545+%23ff0000+W20%0D%0AUNIPROT%3AQ9HAW9+%2300ff00+W10%0D%0Amap00040+%230000ff+W10" +
  "&default_opacity=1" +
  "&default_width=3" +
  "&default_radius=7" +
  "&default_color=%23aaaaaa" +
  "&background_color=%23ffffff" +
  "&tax_filter=" +
  "&map=metabolic" +
  "&export_type=svg" +
  "&export_dpi=120";

/* 
TODO: 
1. read one line, replace '/t' with '+' between meata data and append '\r\n' at the end
2. check if the next with the same chinese_id, if yes, jump to step 1
3. make the request, write down the result in separate data named with chinese_id, if failed, append 
   this chinese_id into error report file
*/
