/**
 * Vercel/Node24-compatible patch for blakejs and @zk-kit/eddsa-poseidon
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

// ── Patch 1: blakejs ESM shim ──────────────────────────────────────────────

const blakePkgPath = "./node_modules/blakejs/package.json";
const blakeShimPath = "./node_modules/blakejs/esm.mjs";

if (existsSync(blakePkgPath)) {
  const pkg = JSON.parse(readFileSync(blakePkgPath, "utf8"));
  if (!pkg.exports) {
    pkg.exports = {
      ".": {
        import: "./esm.mjs",
        require: "./index.js",
        default: "./index.js",
      },
    };

    const shim = `// ESM re-export shim — auto-generated
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pkg = require("./index.js");
export const {
  blake2b, blake2bHex, blake2bInit, blake2bUpdate, blake2bFinal,
  blake2s, blake2sHex, blake2sInit, blake2sUpdate, blake2sFinal,
} = pkg;
export default pkg;
`;

    writeFileSync(blakePkgPath, JSON.stringify(pkg, null, 2) + "\n");
    writeFileSync(blakeShimPath, shim);
    console.log("Patched blakejs: added ESM named-export shim");
  } else {
    console.log("blakejs exports already exist — skipping");
  }
} else {
  console.log("blakejs not found — skipping patch");
}

// ── Patch 2: @zk-kit/eddsa-poseidon CJS stub ───────────────────────────────

const eddsaPkgPath = "./node_modules/@zk-kit/eddsa-poseidon/package.json";
const eddsaDistDir = "./node_modules/@zk-kit/eddsa-poseidon/dist";
const eddsaCjsDir = join(eddsaDistDir, "lib.commonjs");
const eddsaCjsStub = join(eddsaCjsDir, "eddsa-poseidon-blake-2b.cjs");

if (existsSync(eddsaPkgPath)) {
  const eddsaPkg = JSON.parse(readFileSync(eddsaPkgPath, "utf8"));

  // Determine the correct main file
  const mainFileCjs = join(eddsaDistDir, "index.cjs");
  const mainFileJs = join(eddsaDistDir, "index.js");
  const mainFile = existsSync(mainFileCjs) ? "./dist/index.cjs" : "./dist/index.js";

  // Fix package.json export for ./blake-2b
  eddsaPkg.exports = {
    ...eddsaPkg.exports,
    "./blake-2b": {
      import: "./dist/index.js",
      require: mainFile,
    },
  };
  writeFileSync(eddsaPkgPath, JSON.stringify(eddsaPkg, null, 2) + "\n");
  console.log("Patched @zk-kit/eddsa-poseidon package.json exports for ./blake-2b");

  // Create missing stub
  if (!existsSync(eddsaCjsStub)) {
    mkdirSync(eddsaCjsDir, { recursive: true });
    const stub = `// CJS stub — auto-generated
// @zk-kit/eddsa-poseidon references this file but never published it
"use strict";
module.exports = require("../index.js");
`;
    writeFileSync(eddsaCjsStub, stub);
    console.log("Created @zk-kit/eddsa-poseidon missing CJS stub");
  } else {
    console.log("CJS stub already exists — skipping");
  }
} else {
  console.log("@zk-kit/eddsa-poseidon not found — skipping patch");
}