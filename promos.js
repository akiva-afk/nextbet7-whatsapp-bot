{\rtf1\ansi\ansicpg1252\cocoartf2822
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tqr\tx566\tqr\tx1133\tqr\tx1700\tqr\tx2267\tqr\tx2834\tqr\tx3401\tqr\tx3968\tqr\tx4535\tqr\tx5102\tqr\tx5669\tqr\tx6236\tqr\tx6803\pardirnatural\qr\partightenfactor0

\f0\fs24 \cf0 // promos.js \'97 \uc0\u1494 \u1502 \u1504 \u1497 ; \u1489 \u1513 \u1500 \u1489  \u1492 \u1489 \u1488  \u1504 \u1495 \u1489 \u1512  \u1500 -CRM \u1513 \u1500 \u1498 \
let cache = \{\
  items: [\
    \{ id: "WEEKEND-30LC", title: "30% \uc0\u1511 \u1488 \u1513 \u1489 \u1511  \u1489 \u1500 \u1497 \u1497 \u1489  \u1511 \u1494 \u1497 \u1504 \u1493 ", short: "\u1492 \u1495 \u1494 \u1512  \u1506 \u1491  \u1505 \u1499 \u1493 \u1501  X, \u1514 \u1504 \u1488 \u1497 \u1501  \u1511 \u1500 \u1497 \u1501 ", code: "30LC", active: true \},\
    \{ id: "FS-20",        title: "20 \uc0\u1505 \u1497 \u1489 \u1493 \u1489 \u1497 \u1501  \u1495 \u1497 \u1504 \u1501 ",        short: "\u1489 \u1514 \u1493 \u1511 \u1507  24 \u1513 \u1506 \u1493 \u1514 , \u1494 \u1499 \u1497 \u1497 \u1492  \u1506 \u1491  1000 \u1504 \u1511 \u1523 ", code: "FS20", active: true \}\
  ],\
  ts: 0\
\};\
\
async function getPromos() \{\
  return cache.items;\
\}\
\
module.exports = \{ getPromos \};\
}