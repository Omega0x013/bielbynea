/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import path from "path";
import crypto from "crypto";
import { v4 as uuid4 } from "uuid";

export default {
  get: async (req, res) => {
    if (req.accepts("html")) {
      /**
       * It's a browser
       */
      if (req.cookies.username && req.cookies.token) {
        const query = await db.users.where(
          "username",
          "==",
          req.cookies.username,
        ).get();
        if (!query.empty) {
          const doc = query.docs[0];
          if (doc.data().token == req.cookies.token) {
            /**
             * User is validated
             */
            res.sendFile(path.join(path.resolve() + "/static/account.html"));
            return;
          }
        }
      }
      /**
       * User needs to log in
       */
      res.sendFile(path.join(path.resolve() + "/static/login.html"));
    } else if (req.accepts("json")) {
      /**
       * It's the JS
       */
      if (req.cookies.username && req.cookies.token) {
        const query = await db.users.where(
          "username",
          "==",
          req.cookies.username,
        ).get();
        if (!query.empty) {
          const doc = query.docs[0];
          if (doc.data().token == req.cookies.token) {
            /**
             * User is validated, we've already bothered the database for their
             * details so now be just need to send a select few of them back.
             */
            const data = doc.data();
            res.status(200).json({
              username: data.username,
              bio: data.bio,
              nsfw: data.nsfw,
              points: data.points,
            });
            return;
          }
        }
      }
      /**
       * User is not logged in
       */
      res.status(401).json({ error: "credentials-invalid" });
    } else {
      /**
       * The server can't give a response in an acceptable type
       */
      res.status(406);
    }
  },
  post: async (req, res) => {
    /**
     * The body parsing middleware allows for both
     * - application/json
     * - application/x-www-form-urlencoded
     */
    res.type("application/json");
    switch (req.body.action) {
      case "login":
        if (req.body.username && req.body.password) {
          const query = await db.users.where(
            "username",
            "==",
            req.body.username,
          ).get();
          if (!query.empty) {
            const doc = query.docs[0];
            const hash = crypto.createHash("sha256").update(
              req.body.username + req.body.password,
            ).digest("hex");
            if (doc.data().hash == hash) {
              const token = uuid4();
              await db.users.doc(doc.id).update({ token: token });
              res.cookie("username", req.body.username);
              res.cookie("token", token);
              res.cookie("nsfw", doc.data().nsfw);
              res.json({ message: "success" });
              res.status(200);
              break;
            }
          }
        }
        res.status(400).json({ error: "login-invalid" });
        break;
      case "create":
        // Check if passwords match
        // the !|| is an existence mnemonic
        if (!req.body.password1 || req.body.password1 != req.body.password2) {
          res.status(400).json({ error: "passwords-unmatched" });
          break;
        }

        // Check if user exists (uses DB)
        if (
          req.body.username &&
          !(await db.users.where("username", "==", req.body.username).get())
            .empty
        ) {
          res.status(400).json({ error: "user-exists" });
          break;
        }

        const token = uuid4();

        // Add the new user to the database
        await db.users.add({
          username: req.body.username,
          hash: crypto.createHash("sha256").update(
            req.body.username + req.body.password1,
          ).digest("hex"),
          bio: req.body.bio ?? "<i>No bio provided</i>",
          admin: false,
          nsfw: false,
          token: token,
          points: 3,
        });

        res.cookie("username", req.body.username);
        res.cookie("token", token);
        res.cookie("nsfw", false);
        res.status(200);
        break;
      case "set":
        /**
         * Uses document.update to rewrite any newly set fields w/o retrieving
         * the document
         */
      default:
        res.status(400).json({ error: "invalid-action" });
    }
  },
};
