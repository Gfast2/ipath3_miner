"use strict";
var fs = require("fs"),
  readline = require("readline");
const https = require("https");

const lineDivider = "\r\n"; // between line, they should be join with this
const dataDivider = "+"; // meta data of each line should be joined with this

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

let chinese_id = "1";
let line_buff = [];
let pool_payload = [];
let pool_cid = [];

rd.on("line", function (line) {
  const n = line.split("\t");
  const [x, ...y] = n;
  const joinElement = (e) => e.join(dataDivider);
  if (x == chinese_id) {
    line_buff.push(joinElement(y));
  } else {
    pool_payload.push(line_buff.join(lineDivider));
    line_buff = [joinElement(y)];
    pool_cid.push(chinese_id);
    chinese_id = x;
  }
  // console.log(line);
});

const getRequest = () => {
  var postData = buildPayload(pool_payload[0]);
//   console.log("postData");
//   console.log(postData);

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
      process.stdout.write(d);
    });
  });

  req.on("error", (e) => {
    console.error(e);
    // TODO: append chinese_id & its array index into "failed_entry" with format: "<chinese_id>,<index>" on each line
  });

  req.write(postData);
  req.end();
};

rd.on("close", () => {
  //   console.log("file read done");
  //   console.log(pool_payload[0]);
  //   console.log("//////////////////////////////////////");
  //   console.log(pool_payload[1]);
  // console.log('//////////////////////////////////////');
  // console.log(pool[2]);
  getRequest();
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