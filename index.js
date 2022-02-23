/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

"use strict";

import express from "express";
import cookieParser from "cookie-parser";
import routes from "./routes/index.js";
import { Firestore } from "@google-cloud/firestore";

// I'm painfully aware of how bad practice globals are, but in this case it is
// a constant that simply needs to be accessed across the entire namespace.
global.db = {
  conn: new Firestore({
    projectId: "bielbynea",
    keyFilename: "key.json",
  }),
};

global.db.users = global.db.conn.collection("users");
global.db.posts = global.db.conn.collection("posts");
global.db.comments = global.db.conn.collection("comments");

const app = express(); // create the app object

// pre-route middleware
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/static", express.static("static"));

// routes
app.use(routes);

// terminator
app.use((req, res) => res.end());

// post-route setup
app.set("trust proxy", true); // Allow HTTPS in the google cloud environment

// start the server - PORT env var or 8080 if unset
app.listen(process.env.PORT || 8080, () => console.log("Listening..."));
