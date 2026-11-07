import test from "node:test";
import assert from "node:assert/strict";
import { buildLocalPlayerProfile, normalizePlayerName } from "../src/core/player-profile.js";

test("player name normalizes whitespace and safe unicode letters",()=>{
  const result=normalizePlayerName("  Азамат   Player_01  ");
  assert.equal(result.ok,true);
  assert.equal(result.value,"Азамат Player_01");
});

test("player name strips markup and control-like punctuation",()=>{
  const result=normalizePlayerName("<script>Hero!</script>");
  assert.equal(result.ok,true);
  assert.equal(result.value,"scriptHeroscript");
  assert.equal(result.value.includes("<"),false);
  assert.equal(result.value.includes(">"),false);
});

test("local profile is explicit that it is not an online account",()=>{
  const result=buildLocalPlayerProfile("Fighter 01",{now:123});
  assert.equal(result.ok,true);
  assert.deepEqual(result.value,{
    schemaVersion:1,
    kind:"local-player-profile",
    name:"Fighter 01",
    createdAt:123,
    onlineAccount:false,
  });
});
