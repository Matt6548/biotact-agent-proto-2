import test from "node:test";
import assert from "node:assert/strict";
import { RANKING_SECURITY_MODEL, validateRankedSubmission } from "../src/core/leaderboard-policy.js";

test("ranked submission fails closed without authenticated verified identity",()=>{
  assert.equal(validateRankedSubmission({identity:{authenticated:false},receipt:{serverValidated:true,roundId:"r1",score:90}}).reason,"authentication-required");
  assert.equal(validateRankedSubmission({identity:{authenticated:true,verified:false},receipt:{serverValidated:true,roundId:"r1",score:90}}).reason,"verified-account-required");
});

test("ranked submission rejects client-only score without server validation",()=>{
  const result=validateRankedSubmission({
    identity:{authenticated:true,verified:true},
    receipt:{serverValidated:false,roundId:"r1",score:99},
  });
  assert.equal(result.ok,false);
  assert.equal(result.reason,"server-validation-required");
  assert.equal(RANKING_SECURITY_MODEL.acceptsClientOnlyScore,false);
});

test("ranked submission accepts only a validated server receipt",()=>{
  const result=validateRankedSubmission({
    identity:{authenticated:true,verified:true},
    receipt:{serverValidated:true,roundId:"server-r1",score:88},
  });
  assert.equal(result.ok,true);
});
