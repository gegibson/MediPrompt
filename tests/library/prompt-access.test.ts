import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  getServerPromptBody,
  getServerPromptIndex,
} from "@/lib/library/serverData";

describe("prompt freemium metadata", () => {
  it("exposes usage tips and access flag on prompt detail", async () => {
    const prompt = await getServerPromptBody("medication-management-new-inhaler");
    assert.ok(prompt, "prompt should load from fixture data");
    assert.equal(typeof prompt.isFree, "boolean", "prompt should include isFree flag");
    assert.ok(Array.isArray(prompt.usageTips), "usageTips should be an array");
    assert.ok((prompt.usageTips ?? []).length >= 3, "usageTips should include multiple entries");
  });

  it("ensures the prompt index surfaces free vs premium prompts", async () => {
    const index = await getServerPromptIndex();
    assert.ok(index.length > 0, "prompt index should contain entries");
    const premiumExists = index.some((item) => item.isFree === false);
    assert.ok(premiumExists, "index should include at least one premium prompt");
    for (const item of index) {
      assert.equal(typeof item.isFree, "boolean", `prompt ${item.id} should declare isFree`);
    }
  });
});
