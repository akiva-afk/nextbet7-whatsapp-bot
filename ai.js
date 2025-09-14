{\rtf1\ansi\ansicpg1252\cocoartf2822
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tqr\tx566\tqr\tx1133\tqr\tx1700\tqr\tx2267\tqr\tx2834\tqr\tx3401\tqr\tx3968\tqr\tx4535\tqr\tx5102\tqr\tx5669\tqr\tx6236\tqr\tx6803\pardirnatural\qr\partightenfactor0

\f0\fs24 \cf0 // ai.js (CommonJS)\
const OpenAI = require("openai");\
const client = new OpenAI(\{ apiKey: process.env.OPENAI_API_KEY \});\
\
async function generateSmartReply(\{ userText, language = "he", promos = [], userProfile = \{\} \}) \{\
  const promosList =\
    (promos || [])\
      .filter(p => p.active)\
      .slice(0, 5)\
      .map(p => `\'95 $\{p.title\} \'96 $\{p.short\} (\uc0\u1511 \u1493 \u1491 : $\{p.code || "N/A"\})`)\
      .join("\\n") || "\uc0\u1488 \u1497 \u1503  \u1499 \u1512 \u1490 \u1506  \u1502 \u1489 \u1510 \u1506 \u1497 \u1501  \u1508 \u1506 \u1497 \u1500 \u1497 \u1501  \u1489 \u1511 \u1493 \u1504 \u1496 \u1511 \u1505 \u1496 .";\
\
  const system = `\
\uc0\u1488 \u1514 /\u1492  \u1506 \u1493 \u1494 \u1512 /\u1514  \u1495 \u1499 \u1501 /\u1492  \u1513 \u1500  Nextbet7 \u1489 \u1493 \u1493 \u1488 \u1496 \u1505 \u1488 \u1508 . \u1491 \u1489 \u1512 /\u1497  \u1489 \u1513 \u1508 \u1514  \u1492 \u1502 \u1513 \u1514 \u1502 \u1513  (\u1489 \u1512 \u1497 \u1512 \u1514  \u1502 \u1495 \u1491 \u1500  \u1506 \u1489 \u1512 \u1497 \u1514 ).\
\uc0\u1506 \u1504 \u1497 /\u1492  \u1511 \u1510 \u1512  \u1493 \u1489 \u1512 \u1493 \u1512 , \u1513 \u1500 \u1489 \u1497  \u1502 \u1489 \u1510 \u1506  \u1512 \u1500 \u1493 \u1493 \u1504 \u1496 \u1497  \u1488 \u1501  \u1502 \u1514 \u1488 \u1497 \u1501 , \u1493 \u1514 \u1504 \u1497  \u1510 \u1506 \u1491  \u1492 \u1489 \u1488  \u1489 \u1512 \u1493 \u1512  (\u1508 \u1514 \u1497 \u1495 \u1514  \u1502 \u1513 \u1514 \u1502 \u1513 /\u1492 \u1508 \u1511 \u1491 \u1492 /\u1504 \u1510 \u1497 \u1490 ).\
\uc0\u1488 \u1500  \u1514 \u1489 \u1496 \u1497 \u1495 \u1497  \u1491 \u1489 \u1512 \u1497 \u1501  \u1513 \u1500 \u1488  \u1511 \u1497 \u1497 \u1502 \u1497 \u1501 .\
  `.trim();\
\
  const user = `\
\uc0\u1508 \u1512 \u1496 \u1497  \u1502 \u1513 \u1514 \u1502 \u1513 : $\{JSON.stringify(userProfile)\}\
\uc0\u1492 \u1493 \u1491 \u1506 \u1514  \u1502 \u1513 \u1514 \u1502 \u1513 : $\{userText\}\
\uc0\u1502 \u1489 \u1510 \u1506 \u1497 \u1501  \u1494 \u1502 \u1497 \u1504 \u1497 \u1501 :\
$\{promosList\}\
\uc0\u1506 \u1504 \u1492 /\u1497  \u1489 -$\{language === "he" ? "\u1506 \u1489 \u1512 \u1497 \u1514 " : "English"\} \u1506 \u1491  3\'965 \u1502 \u1513 \u1508 \u1496 \u1497 \u1501 , \u1506 \u1501  \u1510 \u1506 \u1491  \u1492 \u1489 \u1488  \u1489 \u1512 \u1493 \u1512 .\
  `.trim();\
\
  const resp = await client.chat.completions.create(\{\
    model: "gpt-4o-mini",\
    messages: [\
      \{ role: "system", content: system \},\
      \{ role: "user", content: user \}\
    ],\
    temperature: 0.5\
  \});\
\
  return resp.choices?.[0]?.message?.content?.trim() || "\uc0\u1500 \u1488  \u1492 \u1510 \u1500 \u1495 \u1514 \u1497  \u1500 \u1506 \u1504 \u1493 \u1514  \u1499 \u1512 \u1490 \u1506 . \u1488 \u1508 \u1513 \u1512  \u1500 \u1504 \u1505 \u1493 \u1514  \u1513 \u1493 \u1489 ?";\
\}\
\
module.exports = \{ generateSmartReply \};\
}