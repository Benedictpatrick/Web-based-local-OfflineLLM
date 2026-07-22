import { describe, expect, it } from "vitest";
import { looksGarbled } from "./garbledOutput";

describe("looksGarbled", () => {
  it("flags the real multi-script word-salad example seen from a corrupted reply", () => {
    const text =
      "മി Walling പരിശോധ موقع destinada Metab Shannon kapan ross consular agner bay பச்சை " +
      "alte syk frauencalorieerce sympathies stai HoodILA throng नांद mutationAttachment precision " +
      "принци イタリア Bihstonesstrictionを持つ shillings disposable Therapeutic членыbrokersInBackgroundaske말로GRANTED " +
      "universitario pasting 연락 sicak Deb поез circuitos PACS pake Ariel colonistsrise mnie guilty " +
      "sekarщихся erwäh oysters elseifhindiハイ hydraz výstav discontinuityBranPurgFOCUS";
    expect(looksGarbled(text)).toBe(true);
  });

  it("does not flag normal coherent English", () => {
    const text =
      "Hello! It's lovely to be here. How about we chat a bit? " +
      "I'd love to hear what's on your mind today, whether it's a question, a project, or just curiosity.";
    expect(looksGarbled(text)).toBe(false);
  });

  it("does not flag a short reply", () => {
    expect(looksGarbled("Paris.")).toBe(false);
    expect(looksGarbled("Hello! It's lovely to be here.")).toBe(false);
  });

  it("does not flag English text that quotes one foreign word or name", () => {
    const text =
      "The French word for hello is bonjour, and it's used all the time in casual conversation " +
      "across France, Quebec, and other French-speaking regions of the world today.";
    expect(looksGarbled(text)).toBe(false);
  });

  it("does not flag genuine multilingual text with long runs per language", () => {
    const text =
      "This is a paragraph written entirely in English to explain the concept clearly for readers. " +
      "이것은 한국어로 작성된 문단으로 같은 개념을 한국어 사용자에게 설명하기 위한 것입니다 정말로 그렇습니다.";
    expect(looksGarbled(text)).toBe(false);
  });

  it("does not flag dense alternation between only two scripts (needs 3+ to count as word salad)", () => {
    const text =
      "Hello 안녕 world 세계 today 오늘 friend 친구 house 집 water 물 fire 불 tree 나무 sky 하늘 sun 해";
    expect(looksGarbled(text)).toBe(false);
  });
});
