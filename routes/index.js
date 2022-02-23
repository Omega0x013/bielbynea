/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import flat from "@omega0x013/flat-express";
import search from "./search.js";
import create from "./create.js";
import account from "./account.js";
import post from "./post.js";
import comment from "./comment.js";

export default flat({
  "/": "/static/root.html",
  "/account": account,
  "/create": create,
  "/create-account": "/static/create-account.html",
  "/search": search,
  "/view/:id": "/static/view.html",
  "/comment/:id": comment,
  "/post/:id": post,
});
